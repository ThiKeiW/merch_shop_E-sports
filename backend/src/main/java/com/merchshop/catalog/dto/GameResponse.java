package com.merchshop.catalog.dto;

import com.merchshop.catalog.Game;

public record GameResponse(Long id, String slug, String name, String accentColor) {

    public static GameResponse from(Game game) {
        return new GameResponse(game.getId(), game.getSlug(), game.getName(), game.getAccentColor());
    }
}
