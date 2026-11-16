package com.merchshop.auth;

import java.util.Set;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;

import com.merchshop.common.ApiException;

/**
 * Verifica los ID tokens emitidos por Google Identity Services contra el JWKS
 * público de Google, validando emisor y audiencia (client ID).
 *
 * <p>Si {@code app.security.google.client-id} está vacío el módulo queda
 * deshabilitado y el endpoint responde 503 en lugar de aceptar tokens.</p>
 */
@Component
public class GoogleTokenVerifier {

    private static final String JWKS_URI = "https://www.googleapis.com/oauth2/v3/certs";
    private static final Set<String> VALID_ISSUERS = Set.of("accounts.google.com", "https://accounts.google.com");

    private final String clientId;
    private final JwtDecoder decoder;

    public GoogleTokenVerifier(@Value("${app.security.google.client-id:}") String clientId) {
        this.clientId = clientId == null ? "" : clientId.trim();
        this.decoder = this.clientId.isEmpty() ? null : buildDecoder(this.clientId);
    }

    public boolean isEnabled() {
        return decoder != null;
    }

    public GoogleIdentity verify(String idToken) {
        if (decoder == null) {
            throw ApiException.unavailable(
                    "Google OAuth no está configurado: define GOOGLE_CLIENT_ID en el servidor");
        }

        Jwt jwt;
        try {
            jwt = decoder.decode(idToken);
        } catch (JwtException ex) {
            throw ApiException.unauthorized("Token de Google inválido o expirado");
        }

        String email = jwt.getClaimAsString("email");
        Object verified = jwt.getClaims().get("email_verified");
        boolean emailVerified = Boolean.TRUE.equals(verified) || "true".equalsIgnoreCase(String.valueOf(verified));

        if (email == null || email.isBlank() || !emailVerified) {
            throw ApiException.unauthorized("La cuenta de Google no tiene un email verificado");
        }

        String subject = jwt.getSubject();
        if (subject == null || subject.isBlank()) {
            throw ApiException.unauthorized("Token de Google sin identificador de usuario");
        }

        return new GoogleIdentity(subject, email, jwt.getClaimAsString("name"));
    }

    private static JwtDecoder buildDecoder(String clientId) {
        NimbusJwtDecoder nimbus = NimbusJwtDecoder.withJwkSetUri(JWKS_URI).build();
        nimbus.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefault(),
                issuerValidator(),
                audienceValidator(clientId)));
        return nimbus;
    }

    private static OAuth2TokenValidator<Jwt> issuerValidator() {
        return jwt -> VALID_ISSUERS.contains(jwt.getClaimAsString("iss"))
                ? OAuth2TokenValidatorResult.success()
                : failure("El token no fue emitido por Google");
    }

    private static OAuth2TokenValidator<Jwt> audienceValidator(String clientId) {
        return jwt -> jwt.getAudience() != null && jwt.getAudience().contains(clientId)
                ? OAuth2TokenValidatorResult.success()
                : failure("La audiencia del token no corresponde a esta aplicación");
    }

    private static OAuth2TokenValidatorResult failure(String description) {
        return OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", description, null));
    }

    public record GoogleIdentity(String subject, String email, String name) {
    }
}
