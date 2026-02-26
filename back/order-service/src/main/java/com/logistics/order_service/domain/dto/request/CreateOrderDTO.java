package com.logistics.order_service.domain.dto.request;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;

public record CreateOrderDTO(
        @NotBlank(message = "O nome do cliente é obrigatório")
        @Size(min = 3, max = 100, message = "O nome deve ter entre 3 e 100 caracteres")
        @Pattern(regexp = "^[A-Za-zÀ-ÖØ-öø-ÿ\\s]*$", message = "O nome não deve conter caracteres especiais ou scripts")
        String customerName,

        @NotNull(message = "O valor do pedido é obrigatório")
        @Positive(message = "O valor deve ser maior que zero")
        @Digits(integer = 10, fraction = 2, message = "Formato de valor inválido (ex: 1000.00)")
        BigDecimal amount
) { }
