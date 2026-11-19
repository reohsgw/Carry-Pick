package com.carrypick.web;

import com.carrypick.common.ApiException;
import com.carrypick.config.AuthUser;
import com.carrypick.service.MarketService;
import com.carrypick.service.OrderService;
import com.carrypick.web.dto.Dtos.*;
import com.carrypick.web.dto.Forms.*;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class MarketController {
    private final MarketService market;
    private final OrderService orders;

    public MarketController(MarketService market, OrderService orders) {
        this.market = market;
        this.orders = orders;
    }

    @GetMapping("/countries/{code}/ranking")
    public RankingDto ranking(@PathVariable String code) {
        return market.ranking(code);
    }

    @GetMapping("/board")
    public List<BoardRow> board() {
        return market.board();
    }

    @GetMapping("/search")
    public SearchDto search(@RequestParam(defaultValue = "") String q, @RequestParam(required = false) String country) {
        return market.search(q, country);
    }

    @GetMapping("/offers")
    public List<OfferDto> offers(@RequestParam(required = false) String country) {
        return market.offersByCountry(country);
    }

    @GetMapping("/offers/mine")
    public List<OfferDto> myOffers(@AuthenticationPrincipal AuthUser me) {
        return market.myOffers(requireLogin(me));
    }

    @GetMapping("/offers/{id}")
    public OfferDto offer(@PathVariable Long id) {
        return market.offer(id);
    }

    @PostMapping("/offers")
    @ResponseStatus(HttpStatus.CREATED)
    public OfferDto createOffer(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody OfferForm form) {
        return market.createOffer(me.id(), form);
    }

    @PatchMapping("/offers/{id}")
    public OfferDto updateOffer(@AuthenticationPrincipal AuthUser me, @PathVariable Long id,
                                @Valid @RequestBody OfferForm form) {
        return market.updateOffer(me.id(), id, form);
    }

    @PostMapping("/offers/{id}/close")
    public OfferDto closeOffer(@AuthenticationPrincipal AuthUser me, @PathVariable Long id) {
        return market.closeOffer(me.id(), id);
    }

    @DeleteMapping("/offers/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteOffer(@AuthenticationPrincipal AuthUser me, @PathVariable Long id) {
        market.deleteOffer(me.id(), id);
    }

    @PostMapping("/requests")
    @ResponseStatus(HttpStatus.CREATED)
    public RequestDto createRequest(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody RequestForm form) {
        return market.createRequest(me.id(), form);
    }

    @GetMapping("/requests/me")
    public List<RequestDto> myRequests(@AuthenticationPrincipal AuthUser me) {
        return market.myRequests(me.id());
    }

    @GetMapping("/requests/open")
    public List<RequestDto> openRequests(@AuthenticationPrincipal AuthUser me) {
        return market.openRequestsForTraveler(me.id());
    }

    @GetMapping("/requests/{id}")
    public RequestDto request(@PathVariable Long id) {
        return market.request(id);
    }

    @PostMapping("/requests/{id}/accept")
    @ResponseStatus(HttpStatus.CREATED)
    public OrderDto accept(@AuthenticationPrincipal AuthUser me, @PathVariable Long id,
                           @RequestBody(required = false) AcceptForm form) {
        return orders.acceptRequest(me.id(), id, form == null ? null : form.tripId());
    }

    @DeleteMapping("/requests/{id}")
    public RequestDto cancelRequest(@AuthenticationPrincipal AuthUser me, @PathVariable Long id) {
        return market.cancelRequest(me.id(), id);
    }

    private static Long requireLogin(AuthUser me) {
        if (me == null) throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Please log in");
        return me.id();
    }
}
