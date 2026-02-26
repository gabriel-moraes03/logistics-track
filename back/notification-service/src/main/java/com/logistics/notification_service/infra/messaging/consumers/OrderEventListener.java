package com.logistics.notification_service.infra.messaging.consumers;

import com.logistics.notification_service.domain.dtos.OrderEventDTO;
import com.logistics.notification_service.infra.messaging.RabbitMQConfig;
import com.logistics.notification_service.infra.messaging.SseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
@Slf4j
@RequiredArgsConstructor
public class OrderEventListener {

    private final SseService sseService;

    @RabbitListener(queues = RabbitMQConfig.ORDER_EVENTS_QUEUE)
    public void onOrderEvent(OrderEventDTO event) {
        log.info("🔔 Processando atualização de status para o pedido: {}", event.id());

        String mensagem = switch (event.status()) {
            case PENDING -> "Olá %s! Recebemos seu pedido. Ele está sendo processado".formatted(event.customerName());
            case PROCESSED -> "%s, seu pedido já foi processado".formatted(event.customerName());
            case SHIPPED ->
                "Boa notícia, %s! Seu pedido foi enviado e está em rota de entrega.".formatted(event.customerName());
            case DELIVERED -> "Pedido entregue! Aproveite sua compra.";
            case CANCELED -> "Atenção: Seu pedido foi cancelado. Verifique os detalhes no app.";
            case COMPLETED ->
                "Seu pedido foi finalizado. Obrigado por confiar em nossa loja, %s!".formatted(event.customerName());
            default -> "O status do seu pedido mudou para: " + event.status();
        };

        enviarNotificacao(mensagem);

        sseService.broadcast(mensagem);
    }

    private void enviarNotificacao(String mensagem) {
        log.info("📧 ENVIANDO NOTIFICAÇÃO: \"{}\"", mensagem);
    }
}
