package com.merchshop.admin.dto;

import java.util.List;

import com.merchshop.catalog.Category;
import com.merchshop.catalog.Game;
import com.merchshop.catalog.Subcategory;
import com.merchshop.catalog.Team;

public record AdminFacetsResponse(
        List<GameOption> games,
        List<CategoryOption> categories,
        List<TeamOption> teams) {

    public record GameOption(Long id, String slug, String name) {

        public static GameOption from(Game game) {
            return new GameOption(game.getId(), game.getSlug(), game.getName());
        }
    }

    public record SubcategoryOption(Long id, String slug, String name) {

        public static SubcategoryOption from(Subcategory subcategory) {
            return new SubcategoryOption(subcategory.getId(), subcategory.getSlug(), subcategory.getName());
        }
    }

    public record CategoryOption(Long id, String slug, String name, List<SubcategoryOption> subcategories) {

        public static CategoryOption from(Category category, List<Subcategory> subcategories) {
            return new CategoryOption(
                    category.getId(),
                    category.getSlug(),
                    category.getName(),
                    subcategories.stream().map(SubcategoryOption::from).toList());
        }
    }

    public record TeamOption(Long id, String slug, String name, String gameSlug) {

        public static TeamOption from(Team team) {
            return new TeamOption(team.getId(), team.getSlug(), team.getName(), team.getGame().getSlug());
        }
    }
}
