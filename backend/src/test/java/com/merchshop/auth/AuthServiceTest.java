package com.merchshop.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Optional;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import com.merchshop.auth.dto.AuthResponse;
import com.merchshop.auth.dto.LoginRequest;
import com.merchshop.auth.dto.RegisterRequest;
import com.merchshop.common.ApiException;
import com.merchshop.security.JwtService;
import com.merchshop.user.Role;
import com.merchshop.user.User;
import com.merchshop.user.UserRepository;

import com.nimbusds.jose.jwk.source.ImmutableSecret;

class AuthServiceTest {

    private UserRepository userRepository;
    private PasswordEncoder passwordEncoder;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        passwordEncoder = new BCryptPasswordEncoder(4);
        authService = new AuthService(userRepository, passwordEncoder, jwtService());
    }

    @Test
    void registerNormalizaEmailYAsignaRolCliente() {
        when(userRepository.existsByEmailIgnoreCase("nuevo@merchshop.dev")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setId(10L);
            return user;
        });

        RegisterRequest request = new RegisterRequest("  Nuevo@MerchShop.dev ", "Secreta123!", "Nuevo Usuario");

        AuthResponse response = authService.register(request);

        assertThat(response.token()).isNotBlank();
        assertThat(response.user().email()).isEqualTo("nuevo@merchshop.dev");
        assertThat(response.user().role()).isEqualTo(Role.CUSTOMER);
        assertThat(response.user().displayName()).isEqualTo("Nuevo Usuario");
    }

    @Test
    void registerConEmailDuplicadoLanzaConflicto() {
        when(userRepository.existsByEmailIgnoreCase("admin@merchshop.dev")).thenReturn(true);

        RegisterRequest request = new RegisterRequest("admin@merchshop.dev", "Secreta123!", "Otro Admin");

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("Ya existe una cuenta");

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void loginConCredencialesValidasDevuelveToken() {
        User user = user(1L, "cliente@merchshop.dev", passwordEncoder.encode("Cliente1234!"));
        when(userRepository.findByEmailIgnoreCase("cliente@merchshop.dev")).thenReturn(Optional.of(user));

        AuthResponse response = authService.login(new LoginRequest("Cliente@MerchShop.dev", "Cliente1234!"));

        assertThat(response.token()).isNotBlank();
        assertThat(response.user().role()).isEqualTo(Role.CUSTOMER);
    }

    @Test
    void loginConPasswordIncorrectaLanzaNoAutorizado() {
        User user = user(2L, "cliente@merchshop.dev", passwordEncoder.encode("Cliente1234!"));
        when(userRepository.findByEmailIgnoreCase(anyString())).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.login(new LoginRequest("cliente@merchshop.dev", "incorrecta")))
                .isInstanceOf(ApiException.class)
                .hasMessage("Email o contraseña incorrectos");
    }

    @Test
    void loginDeCuentaDeshabilitadaLanzaProhibido() {
        User user = user(3L, "bloqueado@merchshop.dev", passwordEncoder.encode("Cliente1234!"));
        user.setActive(false);
        when(userRepository.findByEmailIgnoreCase(anyString())).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.login(new LoginRequest("bloqueado@merchshop.dev", "Cliente1234!")))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("deshabilitada");
    }

    @Test
    void loginConEmailInexistenteLanzaNoAutorizado() {
        when(userRepository.findByEmailIgnoreCase(anyString())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(new LoginRequest("nadie@merchshop.dev", "Cliente1234!")))
                .isInstanceOf(ApiException.class)
                .hasMessage("Email o contraseña incorrectos");
    }

    private JwtService jwtService() {
        SecretKey key = new SecretKeySpec(
                "test-secret-para-pruebas-unitarias-1234567890".getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        var encoder = new NimbusJwtEncoder(new ImmutableSecret<>(key));
        var decoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
        decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer("merch-shop"));
        return new JwtService(encoder, decoder, "merch-shop", Duration.ofHours(1));
    }

    private User user(Long id, String email, String passwordHash) {
        User user = new User(email, passwordHash, "Usuario Test");
        user.setId(id);
        return user;
    }
}
