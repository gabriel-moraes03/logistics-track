package com.logistics.notification_service.infra.messaging;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
@Slf4j
public class SseService {

    // Lista de conexões ativas
    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    public SseEmitter addEmitter() {
        SseEmitter emitter = new SseEmitter(600_000L); // Time-out de 10 minutos

        // Remove da lista quando a conexão termina ou dá erro
        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> emitters.remove(emitter));
        emitter.onError((ex) -> emitters.remove(emitter));

        emitters.add(emitter);
        return emitter;
    }

    public void broadcast(String message) {
        for (SseEmitter emitter : emitters) {
            try {
                // Envia a string para o navegador
                emitter.send(SseEmitter.event().data(message));
            } catch (IOException e) {
                emitters.remove(emitter);
                log.warn("Erro ao enviar mensagem SSE, removendo conexão.");
            }
        }
    }
}
