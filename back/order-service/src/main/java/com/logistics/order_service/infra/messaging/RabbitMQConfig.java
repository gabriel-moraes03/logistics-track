package com.logistics.order_service.infra.messaging;

import org.springframework.amqp.core.Queue;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String ORDER_EVENTS_QUEUE = "orders.v1.order-events";

    @Bean
    public Queue orderCreatedQueue() {
        return new Queue(ORDER_EVENTS_QUEUE, true);
    }

    @Bean
    public MessageConverter messageConverter() {
        // Criamos o ObjectMapper de forma explícita para não ter erro
        var objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();

        // 1. Registra o módulo de tempo (essencial para LocalDateTime)
        objectMapper.registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());

        // 2. Desativa a escrita de datas como arrays [2026, 2, 25...]
        // Isso gera uma String ISO-8601 que o RabbitMQ entende muito melhor
        objectMapper.disable(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        // 3. (Opcional) Garante que o Jackson saiba lidar com Records sem construtor padrão
        objectMapper.setVisibility(com.fasterxml.jackson.annotation.PropertyAccessor.ALL, com.fasterxml.jackson.annotation.JsonAutoDetect.Visibility.ANY);

        return new Jackson2JsonMessageConverter(objectMapper);
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory, MessageConverter messageConverter) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(messageConverter);
        return template;
    }

}
