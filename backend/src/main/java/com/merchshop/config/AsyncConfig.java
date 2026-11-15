package com.merchshop.config;

import java.util.concurrent.Executor;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/**
 * Ejecutores separados para correos y webhooks.
 *
 * <p>Colas acotadas y {@link java.util.concurrent.ThreadPoolExecutor.CallerRunsPolicy}
 * para que, si el pool se satura, no se pierdan tareas en silencio.</p>
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean(name = "mailExecutor")
    public Executor mailExecutor(
            @Value("${app.async.mail.core-pool-size}") int corePoolSize,
            @Value("${app.async.mail.max-pool-size}") int maxPoolSize,
            @Value("${app.async.mail.queue-capacity}") int queueCapacity) {
        return buildExecutor("mail-", corePoolSize, maxPoolSize, queueCapacity);
    }

    @Bean(name = "webhookExecutor")
    public Executor webhookExecutor(
            @Value("${app.async.webhook.core-pool-size}") int corePoolSize,
            @Value("${app.async.webhook.max-pool-size}") int maxPoolSize,
            @Value("${app.async.webhook.queue-capacity}") int queueCapacity) {
        return buildExecutor("webhook-", corePoolSize, maxPoolSize, queueCapacity);
    }

    private ThreadPoolTaskExecutor buildExecutor(String prefix, int corePoolSize, int maxPoolSize, int queueCapacity) {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(corePoolSize);
        executor.setMaxPoolSize(maxPoolSize);
        executor.setQueueCapacity(queueCapacity);
        executor.setThreadNamePrefix(prefix);
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);
        executor.setRejectedExecutionHandler(new java.util.concurrent.ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }
}
