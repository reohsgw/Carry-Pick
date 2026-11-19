package com.carrypick.config;

import com.carrypick.domain.*;
import com.carrypick.repo.*;
import com.carrypick.service.PricingService;
import com.carrypick.service.Today;
import com.carrypick.service.PricingService.Quote;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;

@Component
@org.springframework.core.annotation.Order(1)
public class DataSeeder implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);
    public static final String DEMO_PASSWORD = "carrypick123";

    private final AppProperties props;
    private final UserRepository users;
    private final TripRepository trips;
    private final OfferRepository offers;
    private final RequestRepository requests;
    private final OrderRepository orders;
    private final SettlementRepository settlements;
    private final PasswordEncoder encoder;
    private final PricingService pricing;
    private final PaymentRepository payments;
    private final com.carrypick.service.ExchangeRateService fx;

    public DataSeeder(AppProperties props, UserRepository users, TripRepository trips, OfferRepository offers,
                      RequestRepository requests, OrderRepository orders, SettlementRepository settlements,
                      PasswordEncoder encoder, PricingService pricing, PaymentRepository payments,
                      com.carrypick.service.ExchangeRateService fx) {
        this.props = props;
        this.users = users;
        this.trips = trips;
        this.offers = offers;
        this.requests = requests;
        this.orders = orders;
        this.settlements = settlements;
        this.encoder = encoder;
        this.pricing = pricing;
        this.payments = payments;
        this.fx = fx;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!props.seedDemoData() || users.count() > 0) return;
        LocalDate today = Today.get();
        String pw = encoder.encode(DEMO_PASSWORD);

        // Minji is the live buyer in the demo: a first-time user with no requests or orders yet.
        User minji = users.save(new User("buyer@carrypick.test", pw, "Minji (Buyer)", Mode.BUYER, true));
        User jun = users.save(new User("buyer2@carrypick.test", pw, "Jun (Buyer)", Mode.BUYER, true));
        // Another buyer for requests on the board; Minji stays free for the live buyer demo.
        User seoyeon = users.save(new User("buyer3@carrypick.test", pw, "Seoyeon (Buyer)", Mode.BUYER, true));
        User kenji = users.save(new User("traveler@carrypick.test", pw, "Kenji (Traveler)", Mode.TRAVELER, true));
        User linh = users.save(new User("traveler2@carrypick.test", pw, "Linh (Traveler)", Mode.TRAVELER, true));
        kenji.setPayoutAccount("KB국민은행", "12345678901234", "Kenji");
        linh.setPayoutAccount("신한은행", "110123456789", "Linh");
        users.save(kenji);
        users.save(linh);

        // Kenji's trips for the demo: two finished trips. His current Tokyo trip is added live in the demo.
        Trip osaka = trips.save(new Trip(kenji, "JP", "Osaka", LocalDate.of(2024, 10, 24), LocalDate.of(2024, 10, 30),
                "Half a suitcase free"));
        Trip nyc = trips.save(new Trip(kenji, "US", "New York", LocalDate.of(2025, 2, 13), LocalDate.of(2025, 2, 20),
                "One empty suitcase"));

        Trip paris = trips.save(new Trip(linh, "FR", "Paris", today.plusDays(20), today.plusDays(28),
                "Small items only, about 3 kg"));
        // Linh's upcoming Japan trip keeps Japan bookable while Kenji's Japan trips are finished or under way.
        Trip linhTokyo = trips.save(new Trip(linh, "JP", "Tokyo", today.plusDays(7), today.plusDays(12),
                "One carry-on, about 6 kg"));
        Trip bangkok = trips.save(new Trip(linh, "TH", "Bangkok", today.plusDays(6), today.plusDays(12),
                "Plenty of space"));

        Offer tokyoBanana = offers.save(new Offer(kenji, osaka, "Tokyo Banana (8 pcs)", "Kansai Airport gift shop", "Food",
                "Classic banana custard sponge cakes. Best before about 7 days after purchase.", "demo:tokyo-banana", 12000, 4000, 6));
        Offer royce = offers.save(new Offer(kenji, osaka, "Royce' Nama Chocolate", "Daimaru Umeda", "Food",
                "Needs to stay cool; I will carry it in an insulated bag.", "demo:royce", 18000, 5000, 4));
        Offer anessa = offers.save(new Offer(kenji, osaka, "Anessa Perfect UV Sunscreen 60ml", "Matsumoto Kiyoshi", "Beauty",
                "Japanese drugstore price.", "demo:anessa", 22000, 5000, 5));
        offers.save(new Offer(kenji, osaka, "Uniqlo Japan-limited graphic T-shirt", "Uniqlo Shinsaibashi", "Fashion",
                "Tell me the size in the order note after booking.", "demo:uniqlo-tshirt", 20000, 6000, 3));
        offers.save(new Offer(kenji, osaka, "Kit Kat regional flavors set", "Shin-Osaka station", "Food",
                "Assorted regional flavors, about 6 boxes.", "demo:kitkat", 25000, 7000, 3));
        Offer laduree = offers.save(new Offer(linh, paris, "Ladurée macarons (box of 12)", "Ladurée Champs-Élysées", "Food",
                "Fragile; will hand-carry.", "demo:laduree", 52000, 12000, 2));
        offers.save(new Offer(linh, paris, "Diptyque Baies candle 190g", "Diptyque Saint-Germain", "Home",
                "Paris boutique price.", "demo:diptyque-baies", 98000, 15000, 2));
        offers.save(new Offer(linh, paris, "Bioderma Sensibio H2O 500ml", "Pharmacie Monge", "Beauty",
                "French pharmacy price, much cheaper than Korea.", "demo:bioderma-sensibio", 16000, 5000, 4));
        Offer linhBanana = offers.save(new Offer(linh, linhTokyo, "Tokyo Banana (8 pcs)", "Tokyo Station Gransta", "Food",
                "Fresh box bought the day before I fly back.", "demo:tokyo-banana", 12000, 4000, 10));
        Offer linhRoyce = offers.save(new Offer(linh, linhTokyo, "Royce' Nama Chocolate", "Royce' Ginza", "Food",
                "Carried in an insulated bag.", "demo:royce", 18000, 5000, 6));
        Offer linhKitkat = offers.save(new Offer(linh, linhTokyo, "Kit Kat regional flavors set", "Don Quijote Shibuya", "Food",
                "Mixed regional flavors.", "demo:kitkat", 25000, 7000, 4));
        Offer linhAnessa = offers.save(new Offer(linh, linhTokyo, "Anessa Perfect UV Sunscreen 60ml", "Matsumoto Kiyoshi Ginza", "Beauty",
                "Japanese drugstore price.", "demo:anessa", 22000, 5000, 4));
        Offer mama = offers.save(new Offer(linh, bangkok, "Mama Tom Yum instant noodles (10 pack)", "Big C", "Food",
                "Family pack.", "demo:mama-tom-yum", 7000, 3000, 8));
        offers.save(new Offer(linh, bangkok, "Naraya cotton bag", "Naraya Siam", "Fashion",
                "Choose color in the order note.", "demo:naraya-bag", 9000, 3000, 5));
        offers.save(new Offer(kenji, nyc, "Trader Joe's tote bag", "Trader Joe's Manhattan", "Fashion",
                "Mini or regular size.", "demo:trader-joes-tote", 6000, 3000, 6));
        offers.save(new Offer(kenji, nyc, "Levi's 501 Original jeans", "Levi's Times Square", "Fashion",
                "US pricing; tell me waist and length.", "demo:levis-501", 95000, 15000, 2));

        requests.save(new PurchaseRequest(seoyeon, "JP", "Sanrio Hello Kitty Tokyo Limited Edition", null, "demo:hello-kitty-tokyo",
                "Any Tokyo-only design", "Character store in Ikebukuro or Shibuya", 45000, 10000, today.plusDays(30)));
        // More Japan requests, so a traveler who adds a Japan trip sees a full request board.
        requests.save(new PurchaseRequest(jun, "JP", "Tokyo Banana (8 pcs)", null, "demo:tokyo-banana",
                "2 boxes if possible", "For my parents, any flavor is fine", 26000, 5000, today.plusDays(10)));
        requests.save(new PurchaseRequest(seoyeon, "JP", "Royce' Nama Chocolate", null, "demo:royce",
                "Original (Au Lait)", "Please keep it cold, it melts easily", 25000, 6000, today.plusDays(12)));
        requests.save(new PurchaseRequest(jun, "JP", "Anessa Perfect UV Sunscreen 60ml", null, "demo:anessa",
                "Gold bottle, 60ml", "Any drugstore is fine", 30000, 5000, today.plusDays(14)));
        requests.save(new PurchaseRequest(jun, "JP", "Uniqlo Japan-limited graphic T-shirt", null, "demo:uniqlo-tshirt",
                "Size L, any Tokyo design", null, 30000, 6000, today.plusDays(18)));
        requests.save(new PurchaseRequest(jun, "JP", "Kit Kat regional flavors set", null, "demo:kitkat",
                "Matcha and sakura flavors", "A mix of regional flavors is great too", 35000, 7000, today.plusDays(20)));
        requests.save(new PurchaseRequest(seoyeon, "FR", "Le Labo Santal 33 50ml", null, "demo:le-labo-santal33",
                "50ml", "Paris boutique only please", 260000, 20000, today.plusDays(35)));
        requests.save(new PurchaseRequest(jun, "TH", "Jim Thompson silk scarf", null, "demo:jim-thompson-scarf",
                "Blue tones", null, 70000, 10000, today.plusDays(20)));

        localBudgets();

        demoOrder(jun, tokyoBanana, 5);
        demoOrder(seoyeon, tokyoBanana, 3);
        demoOrder(jun, royce, 2);
        demoOrder(jun, anessa, 1);
        demoOrder(seoyeon, laduree, 2);
        demoOrder(jun, mama, 1);

        // Recent bookings on Linh's upcoming Tokyo trip: paid, waiting for her to buy. These keep the
        // Japan ranking current (it counts the last 30 days).
        recentOrder(jun, linhBanana, 3);
        recentOrder(seoyeon, linhBanana, 2);
        recentOrder(jun, linhRoyce, 2);
        recentOrder(seoyeon, linhRoyce, 1);
        recentOrder(jun, linhKitkat, 2);
        recentOrder(seoyeon, linhAnessa, 1);

        log.info("Demo data created. Log in with buyer@carrypick.test or traveler@carrypick.test / {}", DEMO_PASSWORD);
    }

    private void demoOrder(User buyer, Offer offer, int howMany) {
        for (int i = 0; i < howMany; i++) {
            Quote q = pricing.quote(offer.getEstPrice(), offer.getReward());
            Order o = new Order(buyer, offer.getTraveler(), offer, null, offer.getProductName(), offer.getCountryCode(),
                    offer.getImageUrl(), 1, q.budget(), q.reward(), q.fee(), q.tax(), offer.getTrip().getReturnDate());
            // Booked before the trip, bought during it, handed over and settled after the traveler is back.
            Trip trip = offer.getTrip();
            Instant booked = at(trip.getDepartDate().minusDays(3 + i), 10 + i % 8);
            Instant bought = at(trip.getDepartDate().plusDays(i % 3), 15);
            Instant handed = at(trip.getReturnDate().plusDays(1 + i % 2), 18);
            Instant settled = at(trip.getReturnDate().plusDays(2 + i % 3), 11);
            o.setCreatedAt(booked);
            o.setPaidAt(booked);
            o.setActualPrice(q.budget());
            o.setPurchasedAt(bought);
            o.setDeliveredAt(handed);
            o.setCompletedAt(settled);
            o.setSettledAt(settled);
            o.setStatus(OrderStatus.SETTLED);
            orders.save(o);
            settlements.save(new Settlement(o, q.budget() + q.reward(), 0, q.fee()));
        }
    }

    private void recentOrder(User buyer, Offer offer, int howMany) {
        for (int i = 0; i < howMany; i++) {
            Quote q = pricing.quote(offer.getEstPrice(), offer.getReward());
            Order o = new Order(buyer, offer.getTraveler(), offer, null, offer.getProductName(), offer.getCountryCode(),
                    offer.getImageUrl(), 1, q.budget(), q.reward(), q.fee(), q.tax(), offer.getTrip().getReturnDate());
            Instant when = Instant.now().minus(java.time.Duration.ofHours(6 + 19L * (i + offer.getId())));
            o.setCreatedAt(when);
            o.setPaidAt(when);
            o.setStatus(OrderStatus.PAID);
            orders.save(o);
            offer.reserve(1);
            Payment p = new Payment(o, PaymentType.INITIAL, q.total(), "demo-" + o.getId(), true);
            p.setPaymentKey("demo_" + o.getId());
            p.setStatus(PaymentStatus.SUCCESS);
            p.setCompletedAt(when);
            payments.save(p);
        }
    }

    /**
     * Demo requests show their budget the way a buyer types it now: a round amount in the country's currency
     * (e.g. ¥3,100), converted to won at the current rate.
     */
    private void localBudgets() {
        for (PurchaseRequest r : requests.findAll()) {
            String currency = Countries.find(r.getCountryCode()).map(Countries.Country::currency).orElse(null);
            Double rate = currency == null ? null : fx.krwPerUnit(currency);
            if (rate == null || "KRW".equals(currency)) continue;
            double step = switch (currency) {
                case "JPY", "TWD" -> 100;
                case "THB" -> 10;
                case "VND", "IDR" -> 1000;
                default -> 1;
            };
            double local = Math.max(step, Math.round(r.getMaxBudget() / rate / step) * step);
            r.useLocalBudget(currency, java.math.BigDecimal.valueOf(local).stripTrailingZeros(), rate);
        }
    }

    private static Instant at(LocalDate day, int hour) {
        return day.atTime(hour, 0).atZone(java.time.ZoneId.of("Asia/Seoul")).toInstant();
    }
}
