package com.logistics.order_service.service;

import com.logistics.order_service.domain.dto.request.CreateOrderDTO;
import com.logistics.order_service.domain.dto.request.UpdateOrderDTO;
import com.logistics.order_service.domain.dto.response.OrderResponseDTO;
import com.logistics.order_service.domain.entity.Order;
import com.logistics.order_service.domain.enums.OrderStatus;
import com.logistics.order_service.infra.messaging.RabbitMQConfig;
import com.logistics.order_service.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final RabbitTemplate rabbitTemplate;

    @Transactional
    public OrderResponseDTO create(CreateOrderDTO dto) {
        Order order = Order.builder().customerName(dto.customerName()).amount(dto.amount()).build();
        Order savedOrder = orderRepository.save(order);

        OrderResponseDTO response = OrderResponseDTO.from(savedOrder);

        rabbitTemplate.convertAndSend(RabbitMQConfig.ORDER_EVENTS_QUEUE, response);

        return response;
    }

    @Transactional
    public OrderResponseDTO update(UUID orderId, UpdateOrderDTO dto) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Pedido não encontrado"));

        OrderStatus currentStatus = order.getStatus();

        if (currentStatus == OrderStatus.CANCELED) {
            throw new IllegalArgumentException("Não é possível atualizar o status de um pedido cancelado");
        }

        if (currentStatus == OrderStatus.COMPLETED) {
            throw new IllegalArgumentException("Não é possível atualizar o status de um pedido finalizado");
        }

        OrderStatus newStatus = dto.status();

        validarStatus(currentStatus, newStatus);

        order.setStatus(newStatus);
        OrderResponseDTO response = OrderResponseDTO.from(orderRepository.save(order));

        rabbitTemplate.convertAndSend(RabbitMQConfig.ORDER_EVENTS_QUEUE, response);

        return response;
    }

    @Transactional(readOnly = true)
    public OrderResponseDTO findById(UUID orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Pedido não encontrado"));

        return OrderResponseDTO.from(order);
    }

    @Transactional(readOnly = true)
    public List<OrderResponseDTO> findAll() {
        return orderRepository.findAll().stream().map(OrderResponseDTO::from).toList();
    }

    @Transactional(readOnly = true)
    public List<OrderResponseDTO> findByStatus(OrderStatus status) {
        return orderRepository.findAllByStatus(status).stream().map(OrderResponseDTO::from).toList();
    }

    private void validarStatus(OrderStatus atual, OrderStatus novo) {
        if (novo.ordinal() <= atual.ordinal()) {
            // Lançando uma exceção com uma mensagem personalizada
            throw new IllegalArgumentException("Não é permitido retroceder o status do pedido.");
        }
    }
}
