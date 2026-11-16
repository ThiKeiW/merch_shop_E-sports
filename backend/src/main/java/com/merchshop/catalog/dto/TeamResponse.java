package com.merchshop.catalog.dto;

import com.merchshop.catalog.Team;

public record TeamResponse(Long id, String slug, String name, String gameSlug) {

    public static TeamResponse from(Team team) {
        return new TeamResponse(team.getId(), team.getSlug(), team.getName(), team.getGame().getSlug());
    }
}
