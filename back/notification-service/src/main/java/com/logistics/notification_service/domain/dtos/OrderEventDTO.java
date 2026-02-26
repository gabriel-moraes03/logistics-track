package com.logistics.notification_service.domain.dtos;

import com.logistics.notification_service.domain.enums.OrderStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record OrderEventDTO(
        UUID id,
        String customerName,
        BigDecimal amount,
        OrderStatus status,
        LocalDateTime createdAt) {
}
