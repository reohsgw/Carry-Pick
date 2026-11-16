package com.carrypick.web;

import com.carrypick.config.AuthUser;
import com.carrypick.service.TripService;
import com.carrypick.web.dto.Dtos.TripDto;
import com.carrypick.web.dto.Forms.TripForm;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/trips")
public class TripController {
    private final TripService service;

    public TripController(TripService service) {
        this.service = service;
    }

    @GetMapping
    public List<TripDto> upcoming() {
        return service.upcoming();
    }

    @GetMapping("/me")
    public List<TripDto> mine(@AuthenticationPrincipal AuthUser me, @RequestParam(defaultValue = "false") boolean includePast) {
        return service.mine(me.id(), includePast);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TripDto create(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody TripForm f) {
        return service.create(me.id(), f);
    }
}
