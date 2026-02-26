package com.logistics.order_service.domain.dto.request;

import com.logistics.order_service.domain.enums.OrderStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateOrderDTO(
    @NotNull(message = "O status do pedido deve ser informado")
    OrderStatus status
) { }
