#!/usr/bin/env ruby
# frozen_string_literal: true

require 'socket'
require 'digest/sha1'
require 'base64'
require 'json'
require 'uri'
require 'thread'

ROOT = File.expand_path(__dir__)
PORT = Integer(ARGV[0] || ENV.fetch('PORT', 8080))
MIME_TYPES = {
  '.html' => 'text/html; charset=utf-8', '.css' => 'text/css; charset=utf-8',
  '.js' => 'text/javascript; charset=utf-8', '.json' => 'application/json; charset=utf-8',
  '.png' => 'image/png', '.svg' => 'image/svg+xml', '.ico' => 'image/x-icon'
}.freeze

class Client
  attr_reader :socket, :id
  attr_accessor :state

  def initialize(socket, id)
    @socket = socket
    @id = id
    @state = {}
    @write_lock = Mutex.new
  end

  def send_frame(payload, opcode = 1)
    data = payload.to_s.b
    header = [0x80 | opcode].pack('C')
    if data.bytesize < 126
      header << [data.bytesize].pack('C')
    elsif data.bytesize < 65_536
      header << [126, data.bytesize].pack('Cn')
    else
      header << [127, data.bytesize].pack('CQ>')
    end
    @write_lock.synchronize { @socket.write(header + data) }
  end

  def send_json(message)
    send_frame(JSON.generate(message))
  end
end

$clients = {}
$clients_lock = Mutex.new
$next_id = 1
$server = TCPServer.new('0.0.0.0', PORT)

def broadcast(message, except = nil)
  payload = JSON.generate(message)
  clients = $clients_lock.synchronize { $clients.values.dup }
  clients.each do |client|
    next if client.id == except
    begin
      client.send_frame(payload)
    rescue IOError, Errno::EPIPE, Errno::ECONNRESET
      # The reader thread performs the actual disconnect and lobby update.
    end
  end
end

def lobby_snapshot
  players = $clients_lock.synchronize do
    $clients.values.map { |client| client.state.merge('id' => client.id) }
  end
  broadcast('type' => 'lobby', 'players' => players)
end

def read_exact(socket, length)
  data = socket.read(length)
  raise IOError, 'connection closed' unless data && data.bytesize == length
  data
end

def read_frame(socket)
  first, second = read_exact(socket, 2).unpack('C2')
  opcode = first & 0x0f
  masked = (second & 0x80) != 0
  length = second & 0x7f
  length = read_exact(socket, 2).unpack1('n') if length == 126
  length = read_exact(socket, 8).unpack1('Q>') if length == 127
  raise IOError, 'frame too large' if length > 131_072
  mask = masked ? read_exact(socket, 4).bytes : nil
  payload = read_exact(socket, length)
  if mask
    bytes = payload.bytes
    bytes.each_index { |index| bytes[index] ^= mask[index % 4] }
    payload = bytes.pack('C*')
  end
  [opcode, payload]
end

def disconnect(client)
  removed = $clients_lock.synchronize do
    current = $clients.delete(client.id)
    current.equal?(client)
  end
  return unless removed
  begin
    client.socket.close
  rescue IOError
    nil
  end
  broadcast('type' => 'leave', 'id' => client.id)
  lobby_snapshot
  puts "[离队] #{client.state['name'] || client.id} (#{$clients_lock.synchronize { $clients.size }} 在线)"
end

def handle_message(client, message)
  case message['type']
  when 'hello'
    client.state = {
      'name' => message['name'].to_s[0, 24],
      'color' => message['color'].to_s[0, 12],
      'status' => 'hangar',
      'loadout' => message['loadout'].is_a?(Hash) ? message['loadout'] : {},
      'seed' => nil
    }
    lobby_snapshot
  when 'state'
    state = message['state']
    return unless state.is_a?(Hash)
    client.state['status'] = state['status'].to_s[0, 12]
    client.state['seed'] = state['seed'].to_s[0, 40]
    broadcast({ 'type' => 'state', 'id' => client.id, 'state' => state }, client.id)
  when 'chat'
    text = message['text'].to_s.strip[0, 120]
    return if text.empty?
    broadcast('type' => 'chat', 'id' => client.id, 'name' => client.state['name'], 'text' => text)
  when 'deploy'
    seed = message['seed'].to_s[0, 40]
    broadcast('type' => 'deploy', 'id' => client.id, 'seed' => seed)
  when 'fx'
    fx = message['fx']
    return unless fx.is_a?(Hash)
    broadcast({ 'type' => 'fx', 'id' => client.id, 'fx' => fx }, client.id)
  when 'loadout'
    client.state['loadout'] = message['loadout'].is_a?(Hash) ? message['loadout'] : {}
    lobby_snapshot
  end
end

def websocket_loop(socket, client_id)
  client = Client.new(socket, client_id)
  $clients_lock.synchronize { $clients[client_id] = client }
  client.send_json('type' => 'welcome', 'id' => client_id)
  lobby_snapshot
  puts "[接入] 驾驶员 ##{client_id}"
  loop do
    opcode, payload = read_frame(socket)
    case opcode
    when 1
      begin
        message = JSON.parse(payload.force_encoding('UTF-8'))
        handle_message(client, message) if message.is_a?(Hash)
      rescue JSON::ParserError, Encoding::InvalidByteSequenceError
        client.send_json('type' => 'error', 'message' => '无效消息')
      end
    when 8
      break
    when 9
      client.send_frame(payload, 10)
    end
  end
ensure
  disconnect(client) if client
end

def serve_file(socket, target)
  decoded = URI.decode_www_form_component(target.split('?').first.to_s)
  decoded = '/index.html' if decoded == '/'
  if decoded == '/favicon.ico'
    socket.write "HTTP/1.1 204 No Content\r\nConnection: close\r\n\r\n"
    return
  end
  path = File.expand_path('.' + decoded, ROOT)
  unless path.start_with?(ROOT + File::SEPARATOR) && File.file?(path)
    body = '404 - Not Found'
    socket.write "HTTP/1.1 404 Not Found\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: #{body.bytesize}\r\nConnection: close\r\n\r\n#{body}"
    return
  end
  body = File.binread(path)
  mime = MIME_TYPES.fetch(File.extname(path), 'application/octet-stream')
  socket.write "HTTP/1.1 200 OK\r\nContent-Type: #{mime}\r\nContent-Length: #{body.bytesize}\r\nCache-Control: no-cache\r\nX-Content-Type-Options: nosniff\r\nConnection: close\r\n\r\n"
  socket.write(body)
end

def handle_connection(socket)
  request_line = socket.gets("\n", 1024)
  return unless request_line
  headers = {}
  while (line = socket.gets("\n", 8192))
    line = line.strip
    break if line.empty?
    key, value = line.split(':', 2)
    headers[key.downcase] = value.strip if key && value
  end
  method, target = request_line.split(' ', 3)
  return unless method == 'GET'
  if target && target.start_with?('/ws') && headers['sec-websocket-key']
    accept = Base64.strict_encode64(Digest::SHA1.digest(headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'))
    socket.write "HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: #{accept}\r\n\r\n"
    client_id = $clients_lock.synchronize do
      id = $next_id
      $next_id += 1
      id
    end
    websocket_loop(socket, client_id)
  else
    serve_file(socket, target.to_s)
  end
rescue IOError, Errno::ECONNRESET, Errno::EPIPE, ArgumentError
  nil
ensure
  begin
    socket.close unless socket.closed?
  rescue IOError
    nil
  end
end

lan_ip = Socket.ip_address_list.find { |address| address.ipv4_private? }&.ip_address || '127.0.0.1'
puts ''
puts '  断钢：撤离协议 / IRON EXTRACTION'
puts "  本机游玩: http://localhost:#{PORT}"
puts "  局域网联机: http://#{lan_ip}:#{PORT}"
puts '  按 Ctrl+C 停止服务器'
puts ''

begin
  loop do
    socket = $server.accept
    Thread.new(socket) { |connection| handle_connection(connection) }
  end
rescue Interrupt
  puts '\n服务器已停止。'
ensure
  $server.close
end
