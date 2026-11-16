package com.carrypick.service;

import com.carrypick.common.ApiException;
import com.carrypick.domain.*;
import com.carrypick.repo.OfferRepository;
import com.carrypick.repo.OrderRepository;
import com.carrypick.repo.RequestRepository;
import com.carrypick.repo.TripRepository;
import com.carrypick.web.dto.Dtos.*;
import com.carrypick.web.dto.Forms.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class MarketService {
    private static final int RANKING_DAYS = 30;
    private static final Set<OrderStatus> COUNTED = EnumSet.of(
            OrderStatus.PAID, OrderStatus.AWAITING_APPROVAL, OrderStatus.PURCHASED,
            OrderStatus.DELIVERED, OrderStatus.SETTLED);

    private final TripRepository trips;
    private final OfferRepository offers;
    private final RequestRepository requests;
    private final OrderRepository orders;
    private final AuthService auth;
    private final Mapper mapper;
    private final ProductService catalog;

    public MarketService(TripRepository trips, OfferRepository offers, RequestRepository requests,
                         OrderRepository orders, AuthService auth, Mapper mapper, ProductService catalog) {
        this.trips = trips;
        this.offers = offers;
        this.requests = requests;
        this.orders = orders;
        this.auth = auth;
        this.mapper = mapper;
        this.catalog = catalog;
    }

    @Scheduled(initialDelay = 5_000, fixedDelay = 3_600_000)
    @Transactional
    public void housekeeping() {
        LocalDate today = Today.get();
        offers.closeEnded(today, OfferStatus.CLOSED);
        requests.expireOld(today, RequestStatus.OPEN, RequestStatus.EXPIRED);
    }

    @Transactional(readOnly = true)
    public List<OfferDto> offersByCountry(String country) {
        List<Offer> found = isAllCountries(country)
                ? offers.findByStatusOrderByCreatedAtDesc(OfferStatus.ACTIVE)
                : offers.findByCountryCodeAndStatusOrderByCreatedAtDesc(country.toUpperCase(), OfferStatus.ACTIVE);
        return found.stream().map(mapper::offer).toList();
    }

    public static final String ALL_COUNTRIES = "ALL";

    static boolean isAllCountries(String country) {
        return country == null || country.isBlank() || ALL_COUNTRIES.equalsIgnoreCase(country);
    }

    @Transactional(readOnly = true)
    public OfferDto offer(Long id) {
        return mapper.offer(findOffer(id));
    }

    @Transactional(readOnly = true)
    public List<OfferDto> myOffers(Long userId) {
        return offers.findByTravelerIdOrderByCreatedAtDesc(userId).stream().map(mapper::offer).toList();
    }

    @Transactional
    public OfferDto createOffer(Long userId, OfferForm f) {
        User me = auth.require(userId);
        Trip trip = trips.findById(f.tripId()).orElseThrow(() -> ApiException.notFound("Trip"));
        if (!trip.getTraveler().getId().equals(userId)) throw ApiException.forbidden("This is not your trip");
        if (!trip.getDepartDate().isAfter(Today.get())) {
            throw ApiException.badRequest("TRIP_STARTED", "You can only add offers to trips that have not started");
        }
        Offer o = offers.save(new Offer(me, trip, f.productName().trim(), blankToNull(f.store()),
                blankToNull(f.category()), blankToNull(f.description()), blankToNull(f.imageUrl()),
                f.estPrice(), f.reward(), f.quantity()));
        o.setReceiptUrl(blankToNull(f.receiptUrl()));
        o.setProduct(catalog.resolve(f.productId(), o.getProductName(), o.getCategory(), o.getCountryCode()));
        return mapper.offer(o);
    }

    @Transactional
    public OfferDto updateOffer(Long userId, Long offerId, OfferForm f) {
        Offer o = findOffer(offerId);
        if (!o.getTraveler().getId().equals(userId)) throw ApiException.forbidden("This is not your offer");
        if (o.getStatus() == OfferStatus.CLOSED) throw ApiException.conflict("OFFER_CLOSED", "Offer is closed");
        o.update(f.productName().trim(), blankToNull(f.store()), blankToNull(f.category()),
                blankToNull(f.description()), blankToNull(f.imageUrl()), f.estPrice(), f.reward(), f.quantity());
        o.setReceiptUrl(blankToNull(f.receiptUrl()));
        o.setProduct(catalog.resolve(f.productId(), o.getProductName(), o.getCategory(), o.getCountryCode()));
        return mapper.offer(o);
    }

    @Transactional
    public OfferDto closeOffer(Long userId, Long offerId) {
        Offer o = findOffer(offerId);
        if (!o.getTraveler().getId().equals(userId)) throw ApiException.forbidden("This is not your offer");
        o.setStatus(OfferStatus.CLOSED);
        return mapper.offer(o);
    }

    public Offer findOffer(Long id) {
        return offers.findById(id).orElseThrow(() -> ApiException.notFound("Offer"));
    }

    @Transactional
    public RequestDto createRequest(Long userId, RequestForm f) {
        User me = auth.require(userId);
        if (!Countries.exists(f.countryCode())) throw ApiException.badRequest("COUNTRY", "Unsupported country");
        if (f.deadline().isBefore(Today.get().plusDays(1))) {
            throw ApiException.badRequest("DEADLINE", "Deadline must be at least tomorrow");
        }
        PurchaseRequest r = requests.save(new PurchaseRequest(me, f.countryCode().toUpperCase(),
                f.productName().trim(), blankToNull(f.productLink()), blankToNull(f.imageUrl()),
                blankToNull(f.options()), blankToNull(f.note()), f.maxBudget(), f.reward(), f.deadline()));
        r.setProduct(catalog.resolve(f.productId(), r.getProductName(), null, r.getCountryCode()));
        return mapper.request(r);
    }

    @Transactional(readOnly = true)
    public List<RequestDto> myRequests(Long userId) {
        return requests.findByBuyerIdOrderByCreatedAtDesc(userId).stream().map(mapper::request).toList();
    }

    @Transactional(readOnly = true)
    public RequestDto request(Long id) {
        return mapper.request(findRequest(id));
    }

    @Transactional(readOnly = true)
    public List<RequestDto> openRequestsForTraveler(Long userId) {
        LocalDate today = Today.get();
        List<Trip> myTrips = trips.findByTravelerIdAndReturnDateGreaterThanEqualOrderByDepartDateAsc(userId, today);
        if (myTrips.isEmpty()) return List.of();
        Set<String> countries = myTrips.stream().map(Trip::getCountryCode).collect(Collectors.toSet());
        return requests.findByStatusAndCountryCodeInOrderByDeadlineAsc(RequestStatus.OPEN, countries).stream()
                .filter(r -> !r.getBuyer().getId().equals(userId))
                .filter(r -> !r.getDeadline().isBefore(today))
                .filter(r -> matchingTrip(myTrips, r) != null)
                .map(mapper::request)
                .toList();
    }

    @Transactional
    public RequestDto cancelRequest(Long userId, Long requestId) {
        PurchaseRequest r = findRequest(requestId);
        if (!r.getBuyer().getId().equals(userId)) throw ApiException.forbidden("This is not your request");
        if (r.getStatus() != RequestStatus.OPEN) {
            throw ApiException.conflict("REQUEST_NOT_OPEN", "Only open requests can be cancelled");
        }
        r.setStatus(RequestStatus.CANCELLED);
        return mapper.request(r);
    }

    public PurchaseRequest findRequest(Long id) {
        return requests.findById(id).orElseThrow(() -> ApiException.notFound("Request"));
    }

    public Trip matchingTrip(List<Trip> travelerTrips, PurchaseRequest r) {
        LocalDate today = Today.get();
        return travelerTrips.stream()
                .filter(t -> t.getCountryCode().equals(r.getCountryCode()))
                .filter(t -> !t.getReturnDate().isBefore(today))
                .filter(t -> !t.getReturnDate().isAfter(r.getDeadline()))
                .findFirst().orElse(null);
    }

    @Transactional(readOnly = true)
    public List<BoardRow> board() {
        LocalDate today = Today.get();
        Map<Long, List<Offer>> byTrip = offers.findAll().stream()
                .filter(o -> o.isBookable(today))
                .collect(Collectors.groupingBy(o -> o.getTrip().getId()));
        return byTrip.values().stream()
                .map(list -> {
                    Trip t = list.get(0).getTrip();
                    return new BoardRow(t.getId(), t.getCountryCode(), t.getCity(), t.getDepartDate(),
                            t.getReturnDate(), t.getTraveler().getName(), list.size());
                })
                .sorted(Comparator.comparing(BoardRow::departDate))
                .limit(12)
                .toList();
    }

    @Transactional(readOnly = true)
    public SearchDto search(String q, String country) {
        String query = q == null ? "" : q.trim();
        String c = isAllCountries(country) ? null : country.toUpperCase();
        List<Long> productIds = catalog.matchingIds(query);
        Map<Long, Offer> offerHits = new LinkedHashMap<>();
        offers.search(query, OfferStatus.ACTIVE).forEach(o -> offerHits.put(o.getId(), o));
        if (!productIds.isEmpty()) {
            offers.findByProductIdInAndStatus(productIds, OfferStatus.ACTIVE).forEach(o -> offerHits.putIfAbsent(o.getId(), o));
        }
        Map<Long, PurchaseRequest> requestHits = new LinkedHashMap<>();
        requests.search(query, RequestStatus.OPEN).forEach(r -> requestHits.put(r.getId(), r));
        if (!productIds.isEmpty()) {
            requests.findByProductIdInAndStatus(productIds, RequestStatus.OPEN).forEach(r -> requestHits.putIfAbsent(r.getId(), r));
        }
        List<OfferDto> offerDtos = offerHits.values().stream()
                .filter(o -> c == null || o.getCountryCode().equals(c))
                .sorted(Comparator.comparing(Offer::getCreatedAt).reversed())
                .map(mapper::offer).toList();
        List<RequestDto> requestDtos = requestHits.values().stream()
                .filter(r -> c == null || r.getCountryCode().equals(c))
                .sorted(Comparator.comparing(PurchaseRequest::getCreatedAt).reversed())
                .map(mapper::request).toList();
        return new SearchDto(offerDtos, requestDtos);
    }

    @Transactional(readOnly = true)
    public RankingDto ranking(String country) {
        boolean all = isAllCountries(country);
        String c = all ? ALL_COUNTRIES : country.toUpperCase();
        Instant since = Instant.now().minus(Duration.ofDays(RANKING_DAYS));
        List<Object[]> rows = all ? orders.rankProductsAllCountries(COUNTED, since) : orders.rankProducts(c, COUNTED, since);
        List<RankingItem> items = new ArrayList<>();
        int rank = 1;
        for (Object[] row : rows) {
            if (rank > 10) break;
            Product p = catalog.get(((Number) row[0]).longValue());
            long count = ((Number) row[1]).longValue();
            List<Offer> live = offers.findByProductIdAndStatusOrderByCreatedAtDesc(p.getId(), OfferStatus.ACTIVE).stream()
                    .filter(o -> all || o.getCountryCode().equals(c)).toList();
            LocalDate today = Today.get();
            Offer active = live.stream().filter(o -> o.isBookable(today)).findFirst()
                    .orElse(live.isEmpty() ? null : live.get(0));
            Order latest = active != null ? null
                    : orders.findFirstByProductIdOrderByCreatedAtDesc(p.getId()).orElse(null);
            String image = active != null ? active.getImageUrl() : latest != null ? latest.getImageUrl() : null;
            Long estPrice = active != null ? Long.valueOf(active.getEstPrice())
                    : latest != null ? Long.valueOf(latest.getBudget() / Math.max(1, latest.getQuantity())) : null;
            String category = active != null && active.getCategory() != null ? active.getCategory() : p.getCategory();
            items.add(new RankingItem(rank++, p.getName(), count, active != null ? active.getId() : null,
                    image, category, p.getId(), p.getNameKo(), estPrice));
        }
        return new RankingDto(c, true, RANKING_DAYS, items);
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
