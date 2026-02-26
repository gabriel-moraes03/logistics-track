package com.logistics.order_service.controller;

import com.logistics.order_service.domain.dto.request.CreateOrderDTO;
import com.logistics.order_service.domain.dto.request.UpdateOrderDTO;
import com.logistics.order_service.domain.dto.response.OrderResponseDTO;
import com.logistics.order_service.domain.enums.OrderStatus;
import com.logistics.order_service.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/orders")
@RequiredArgsConstructor
public class OrderController {
    private final OrderService orderService;

    @PostMapping
    public ResponseEntity<OrderResponseDTO> create(@Valid @RequestBody CreateOrderDTO dto) {
        OrderResponseDTO response = orderService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<OrderResponseDTO>> findAll() {
        List<OrderResponseDTO> response = orderService.findAll();
        return ResponseEntity.ok().body(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<OrderResponseDTO> findById(@PathVariable UUID id) {
        OrderResponseDTO response = orderService.findById(id);
        return ResponseEntity.ok().body(response);
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<OrderResponseDTO>> findByStatus(@PathVariable OrderStatus status) {
        List<OrderResponseDTO> response = orderService.findByStatus(status);
        return ResponseEntity.ok().body(response);
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<OrderResponseDTO> updateStatus(@PathVariable UUID id,
            @Valid @RequestBody UpdateOrderDTO dto) {
        OrderResponseDTO response = orderService.update(id, dto);
        return ResponseEntity.ok(response);
    }
}
