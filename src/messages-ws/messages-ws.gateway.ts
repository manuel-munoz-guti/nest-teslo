import { JwtService } from '@nestjs/jwt';
import { Socket, Server } from 'socket.io';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { MessagesWsService } from './messages-ws.service';
import { NewMessageDto } from './dto/new-message.dto';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@WebSocketGateway({ cors: true })
export class MessagesWsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() wss: Server;

  constructor(
    private readonly messagesWsService: MessagesWsService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.headers.authentication as string;
    let payload: JwtPayload;

    try {
      payload = this.jwtService.verify(token);
      await this.messagesWsService.registerClient(client, payload.id);
    } catch {
      client.disconnect();
      return;
    }
    // client.join('ventas'); // une al cliente a la sala de ventas
    this.wss.emit(
      'clients-updated',
      this.messagesWsService.getConnectedClients(),
    );
  }

  handleDisconnect(client: Socket) {
    this.messagesWsService.removeClient(client.id);
    this.wss.emit(
      'clients-updated',
      this.messagesWsService.getConnectedClients(),
    );
  }

  @SubscribeMessage('message-client')
  handleMessageClient(client: Socket, payload: NewMessageDto): void {
    this.wss.emit('message-from-server', {
      fullName: this.messagesWsService.getUserFullName(client.id),
      message: payload.message,
    });

    //! Emite unicamente al cliente que emitio el mensaje
    // client.emit('message-from-server', {
    //   clientId: client.id,
    //   message: payload.message,
    // });

    //! Emite a todos los clientes MENOS al cliente inicial
    // client.broadcast.emit('message-from-server', {
    //   clientId: client.id,
    //   message: payload.message,
    // });

    //! Emite un mensaje solo a los clientes en el room ventas
    // this.wss.to('ventas').emit('');
  }
}
