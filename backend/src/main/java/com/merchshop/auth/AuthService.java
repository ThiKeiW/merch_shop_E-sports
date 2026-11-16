package com.merchshop.auth;

import java.util.Locale;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.merchshop.auth.dto.AuthResponse;
import com.merchshop.auth.dto.GoogleLoginRequest;
import com.merchshop.auth.dto.LoginRequest;
import com.merchshop.auth.dto.RegisterRequest;
import com.merchshop.auth.dto.UserResponse;
import com.merchshop.common.ApiException;
import com.merchshop.security.JwtService;
import com.merchshop.user.AuthProvider;
import com.merchshop.user.User;
import com.merchshop.user.UserRepository;

@Service
@Transactional(readOnly = true)
public class AuthService {

    private static final String INVALID_CREDENTIALS = "Email o contraseña incorrectos";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final GoogleTokenVerifier googleTokenVerifier;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       GoogleTokenVerifier googleTokenVerifier) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.googleTokenVerifier = googleTokenVerifier;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.email());

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw ApiException.conflict("Ya existe una cuenta registrada con ese email");
        }

        User user = new User(email, passwordEncoder.encode(request.password()), request.displayName().trim());
        userRepository.save(user);

        return toAuthResponse(user);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.email());

        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> ApiException.unauthorized(INVALID_CREDENTIALS));

        if (!user.isActive()) {
            throw ApiException.forbidden("La cuenta está deshabilitada");
        }

        if (user.getPasswordHash() == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw ApiException.unauthorized(INVALID_CREDENTIALS);
        }

        return toAuthResponse(user);
    }

    /**
     * Login con el ID token de Google Identity Services. Si el email ya existe
     * se reutiliza la cuenta (aunque sea LOCAL); si no, se crea una cuenta
     * GOOGLE sin contraseña.
     */
    @Transactional
    public AuthResponse loginWithGoogle(GoogleLoginRequest request) {
        GoogleTokenVerifier.GoogleIdentity identity = googleTokenVerifier.verify(request.idToken());
        String email = normalizeEmail(identity.email());

        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseGet(() -> createGoogleUser(identity, email));

        if (!user.isActive()) {
            throw ApiException.forbidden("La cuenta está deshabilitada");
        }

        return toAuthResponse(user);
    }

    private User createGoogleUser(GoogleTokenVerifier.GoogleIdentity identity, String email) {
        String displayName = identity.name() != null && !identity.name().isBlank()
                ? identity.name().trim()
                : email.substring(0, email.indexOf('@'));

        User user = new User(email, null, displayName);
        user.setProvider(AuthProvider.GOOGLE);
        user.setProviderId(identity.subject());
        return userRepository.save(user);
    }

    public UserResponse getProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("Usuario no encontrado"));
        return UserResponse.from(user);
    }

    private AuthResponse toAuthResponse(User user) {
        String token = jwtService.generateToken(user);
        return AuthResponse.bearer(token, jwtService.expiresInSeconds(), UserResponse.from(user));
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
