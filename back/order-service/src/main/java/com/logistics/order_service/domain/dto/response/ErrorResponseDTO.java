package com.logistics.order_service.domain.dto.response;

public record ErrorResponseDTO(
        String error,
        String message,
        int status
) {
}
