package com.merchshop.catalog;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TeamRepository extends JpaRepository<Team, Long> {

    List<Team> findByActiveTrueOrderByNameAsc();

    Optional<Team> findBySlug(String slug);

    @Query("""
            select t from Team t
            join t.game g
            where t.active = true and g.slug in :gameSlugs
            order by t.name asc
            """)
    List<Team> findActiveByGameSlugs(@Param("gameSlugs") Collection<String> gameSlugs);
}
