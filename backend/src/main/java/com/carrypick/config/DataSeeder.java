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

        User minji = users.save(new User("buyer@carrypick.test", pw, "Minji (Buyer)", Mode.BUYER, true));
        User jun = users.save(new User("buyer2@carrypick.test", pw, "Jun (Buyer)", Mode.BUYER, true));
        User seoyeon = users.save(new User("buyer3@carrypick.test", pw, "Seoyeon (Buyer)", Mode.BUYER, true));
        User kenji = users.save(new User("traveler@carrypick.test", pw, "Kenji (Traveler)", Mode.TRAVELER, true));
        User linh = users.save(new User("traveler2@carrypick.test", pw, "Linh (Traveler)", Mode.TRAVELER, true));
        kenji.setPayoutAccount("KB국민은행", "12345678901234", "Kenji");
        linh.setPayoutAccount("신한은행", "110123456789", "Linh");
        users.save(kenji);
        users.save(linh);

        Trip osaka = trips.save(new Trip(kenji, "JP", "Osaka", LocalDate.of(2024, 10, 24), LocalDate.of(2024, 10, 30),
                "Half a suitcase free"));
        Trip nyc = trips.save(new Trip(kenji, "US", "New York", LocalDate.of(2025, 2, 13), LocalDate.of(2025, 2, 20),
                "One empty suitcase"));

        Trip paris = trips.save(new Trip(linh, "FR", "Paris", today.plusDays(20), today.plusDays(28),
                "Small items only, about 3 kg"));
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

        User sophie = traveler("traveler3@carrypick.test", pw, "Sophie (Traveler)", "하나은행", "21091001234567");
        User daniel = traveler("traveler4@carrypick.test", pw, "Daniel (Traveler)", "우리은행", "1002345678901");
        User olivia = traveler("traveler5@carrypick.test", pw, "Olivia (Traveler)", "카카오뱅크", "3333012345678");
        User mai = traveler("traveler6@carrypick.test", pw, "Mai (Traveler)", "토스뱅크", "100012345678");
        User arif = traveler("traveler7@carrypick.test", pw, "Arif (Traveler)", "NH농협은행", "3020123456781");
        Trip sophieParis = trips.save(new Trip(sophie, "FR", "Paris", today.plusDays(9), today.plusDays(15),
                "Half a suitcase, nothing liquid over 100ml"));
        Trip danielLa = trips.save(new Trip(daniel, "US", "Los Angeles", today.plusDays(5), today.plusDays(11),
                "One checked bag with room"));
        Trip oliviaLondon = trips.save(new Trip(olivia, "GB", "London", today.plusDays(12), today.plusDays(18),
                "Carry-on plus a small tote"));
        Trip maiBangkok = trips.save(new Trip(mai, "TH", "Bangkok", today.plusDays(4), today.plusDays(10),
                "Lots of space for snacks"));
        Trip arifBali = trips.save(new Trip(arif, "ID", "Bali", today.plusDays(8), today.plusDays(14),
                "About 5 kg free"));

        offers.save(new Offer(sophie, sophieParis, "LU Véritable Petit Beurre", "Monoprix", "Food",
                "The classic French butter biscuit.", "demo:lu-petit-beurre", 5000, 2000, 6));
        offers.save(new Offer(sophie, sophieParis, "Bonne Maman Madeleines", "Carrefour City", "Food",
                "Individually wrapped, travels well.", "demo:bonne-maman-madeleines", 5000, 2000, 6));
        offers.save(new Offer(sophie, sophieParis, "Maille Dijon Mustard", "Maille boutique, Place de la Madeleine", "Food",
                "Original Dijon, sealed jar.", "demo:maille-dijon", 8000, 3000, 4));
        offers.save(new Offer(sophie, sophieParis, "Kusmi Tea Paris Tin", "Kusmi Tea Champs-Élysées", "Food",
                "Tell me the blend you want in the order note.", "demo:kusmi-tea", 27000, 7000, 3));
        offers.save(new Offer(sophie, sophieParis, "Eiffel Tower Keyring & Magnet", "Trocadéro souvenir shop", "Other",
                "Keyring or magnet, your choice.", "demo:paris-keyring", 7000, 3000, 8));

        offers.save(new Offer(daniel, danielLa, "Trader Joe's Dark Chocolate Peanut Butter Cups", "Trader Joe's Silver Lake", "Food",
                "A favourite, sells out fast.", "demo:tj-pb-cups", 8000, 3000, 5));
        offers.save(new Offer(daniel, danielLa, "Ghirardelli Chocolate Squares", "Target", "Food",
                "Premium assortment bag.", "demo:ghirardelli-squares", 21000, 6000, 4));
        offers.save(new Offer(daniel, danielLa, "Gentle Foaming Hand Soap", "Bath & Body Works", "Beauty",
                "Pick a scent in the order note.", "demo:foaming-hand-soap", 10000, 4000, 4));
        offers.save(new Offer(daniel, danielLa, "Been There Series Mug", "Starbucks Hollywood", "Home",
                "Los Angeles edition, boxed.", "demo:been-there-mug", 22000, 6000, 3));
        offers.save(new Offer(daniel, danielLa, "Coach Corner Zip Wristlet", "Coach outlet", "Fashion",
                "US outlet price.", "demo:coach-wristlet", 47000, 10000, 2));

        offers.save(new Offer(olivia, oliviaLondon, "Walkers Pure Butter Shortbread", "Tesco", "Food",
                "Classic red tartan box.", "demo:walkers-shortbread", 5000, 2000, 6));
        offers.save(new Offer(olivia, oliviaLondon, "Fortnum & Mason Royal Blend Tea Tin", "Fortnum & Mason Piccadilly", "Food",
                "From the Piccadilly store.", "demo:fortnum-royal-blend", 20000, 6000, 4));
        offers.save(new Offer(olivia, oliviaLondon, "Cadbury Dairy Milk Bar", "Sainsbury's", "Food",
                "UK recipe.", "demo:cadbury-dairy-milk", 3500, 1500, 8));
        offers.save(new Offer(olivia, oliviaLondon, "Whittard Luxury Hot Chocolate Tin", "Whittard Covent Garden", "Food",
                "Clip-top tin.", "demo:whittard-hot-chocolate", 26000, 7000, 3));
        offers.save(new Offer(olivia, oliviaLondon, "Paddington Bear Keyring", "Paddington Station shop", "Other",
                "Official Paddington keyring.", "demo:paddington-keyring", 15000, 5000, 4));

        offers.save(new Offer(mai, maiBangkok, "Bento Squid Seafood Snack", "7-Eleven", "Food",
                "Spicy, the Thai favourite.", "demo:bento-squid", 1000, 500, 10));
        offers.save(new Offer(mai, maiBangkok, "Koh-Kae Coated Peanuts", "Big C", "Food",
                "Thai sweet chilli flavour.", "demo:koh-kae-peanuts", 2000, 1000, 8));
        offers.save(new Offer(mai, maiBangkok, "ChaTraMue Thai Tea Mix", "ChaTraMue, Siam Paragon", "Food",
                "Original red label tin.", "demo:chatramue-thai-tea", 5000, 2000, 6));
        offers.save(new Offer(mai, maiBangkok, "NaRaYa Ribbon Pouch", "Naraya Central World", "Fashion",
                "Choose color in the order note.", "demo:naraya-pouch", 5000, 2000, 6));
        offers.save(new Offer(mai, maiBangkok, "Poy-Sian Mark II Nasal Inhaler", "Boots", "Beauty",
                "Pack of 6, mixed colours.", "demo:poy-sian-inhaler", 6000, 2000, 8));

        offers.save(new Offer(arif, arifBali, "Indomie Mi Goreng (5 pack)", "Indomaret", "Food",
                "Original flavour.", "demo:indomie-goreng", 2000, 1000, 8));
        offers.save(new Offer(arif, arifBali, "Kopi Luwak Coffee 100g", "Ubud coffee plantation", "Food",
                "Sealed gift tin.", "demo:kopi-luwak", 58000, 12000, 2));
        offers.save(new Offer(arif, arifBali, "Pie Susu Bali", "Krisna Oleh-Oleh", "Food",
                "Box of 10, best eaten within a week.", "demo:pie-susu-bali", 3000, 1500, 6));
        offers.save(new Offer(arif, arifBali, "Ellips Hair Vitamin", "Guardian", "Beauty",
                "6-capsule blister.", "demo:ellips-hair-vitamin", 2000, 1000, 10));
        offers.save(new Offer(arif, arifBali, "Batik Pouch", "Seminyak market", "Fashion",
                "Handmade, every pattern is a little different.", "demo:batik-pouch", 10000, 4000, 4));

        requests.save(new PurchaseRequest(seoyeon, "JP", "Sanrio Hello Kitty Tokyo Limited Edition", null, "demo:hello-kitty-tokyo",
                "Any Tokyo-only design", "Character store in Ikebukuro or Shibuya", 45000, 10000, today.plusDays(30)));
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
        localPrices();

        demoOrder(jun, tokyoBanana, 5);
        demoOrder(seoyeon, tokyoBanana, 3);
        demoOrder(jun, royce, 2);
        demoOrder(jun, anessa, 1);
        demoOrder(seoyeon, laduree, 2);
        demoOrder(jun, mama, 1);

        recentOrder(jun, linhBanana, 3);
        recentOrder(seoyeon, linhBanana, 2);
        recentOrder(jun, linhRoyce, 2);
        recentOrder(seoyeon, linhRoyce, 1);
        recentOrder(jun, linhKitkat, 2);
        recentOrder(seoyeon, linhAnessa, 1);

        log.info("Demo data created. Log in with buyer@carrypick.test or traveler@carrypick.test / {}", DEMO_PASSWORD);
    }

    private User traveler(String email, String pw, String name, String bank, String account) {
        User u = users.save(new User(email, pw, name, Mode.TRAVELER, true));
        u.setPayoutAccount(bank, account, name.replace(" (Traveler)", ""));
        return users.save(u);
    }

    private void demoOrder(User buyer, Offer offer, int howMany) {
        for (int i = 0; i < howMany; i++) {
            Quote q = pricing.quote(offer.getEstPrice(), offer.getReward());
            Order o = new Order(buyer, offer.getTraveler(), offer, null, offer.getProductName(), offer.getCountryCode(),
                    offer.getImageUrl(), 1, q.budget(), q.reward(), q.fee(), q.tax(), offer.getTrip().getReturnDate());
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
            if (lockCurrency(o)) o.setActualLocal(o.getLimitLocal());
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
            lockCurrency(o);
            orders.save(o);
            offer.reserve(1);
            Payment p = new Payment(o, PaymentType.INITIAL, q.total(), "demo-" + o.getId(), true);
            p.setPaymentKey("demo_" + o.getId());
            p.setStatus(PaymentStatus.SUCCESS);
            p.setCompletedAt(when);
            payments.save(p);
        }
    }

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

    private boolean lockCurrency(Order o) {
        String currency = Countries.find(o.getCountryCode()).map(Countries.Country::currency).orElse(null);
        Double rate = currency == null || "KRW".equals(currency) ? null : fx.krwPerUnit(currency);
        if (rate == null) return false;
        Offer offer = o.getOffer();
        java.math.BigDecimal limit = offer != null && offer.hasLocalPrice()
                ? offer.getPriceLocal().multiply(java.math.BigDecimal.valueOf(o.getQuantity()))
                : Order.toLocal(o.getBudget(), rate, Countries.decimals(currency));
        o.lockCurrency(currency, rate, limit);
        return true;
    }

    private void localPrices() {
        for (Offer o : offers.findAll()) {
            String currency = Countries.find(o.getCountryCode()).map(Countries.Country::currency).orElse(null);
            Double rate = currency == null ? null : fx.krwPerUnit(currency);
            if (rate == null || "KRW".equals(currency)) continue;
            double local = Math.max(roundStep(currency), Math.round(o.getEstPrice() / rate / roundStep(currency)) * roundStep(currency));
            o.setLocalPrice(currency, java.math.BigDecimal.valueOf(local).stripTrailingZeros(), rate);
        }
    }

    private static double roundStep(String currency) {
        return switch (currency) {
            case "JPY", "TWD" -> 100;
            case "THB" -> 10;
            case "VND", "IDR" -> 1000;
            default -> 1;
        };
    }

        private static Instant at(LocalDate day, int hour) {
        return day.atTime(hour, 0).atZone(java.time.ZoneId.of("Asia/Seoul")).toInstant();
    }
}
