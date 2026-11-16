//just for demo 
package com.carrypick.config;

import com.carrypick.domain.*;
import com.carrypick.repo.OfferRepository;
import com.carrypick.repo.OrderRepository;
import com.carrypick.repo.ProductRepository;
import com.carrypick.repo.RequestRepository;
import com.carrypick.service.ProductService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Component
@org.springframework.core.annotation.Order(2)
public class CatalogInitializer implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(CatalogInitializer.class);

    private static final String[][] STARTER_CATALOG = {
            {"Tokyo Banana (8 pcs)", "도쿄 바나나 (8개입)", "東京ばな奈", "도쿄바나나, 동경바나나, 도쿄 바나나빵, tokyo banana, 東京バナナ, 일본 과자, 일본 기념품", "Snacks", "JP"},
            {"Royce' Nama Chocolate", "로이스 생초콜릿", "ロイズ 生チョコレート", "로이스, 로이스 초콜릿, 생초콜렛, royce, nama chocolate, 일본 초콜릿", "Snacks", "JP"},
            {"Anessa Perfect UV Sunscreen 60ml", "아넷사 퍼펙트 UV 선크림 60ml", "アネッサ パーフェクトUV スキンケアミルク", "아넷사, 선크림, 썬크림, 자외선 차단제, sunscreen, sunblock, 日焼け止め", "Beauty", "JP"},
            {"Uniqlo Japan-limited graphic T-shirt", "유니클로 일본 한정 그래픽 티셔츠", "ユニクロ 限定 グラフィックTシャツ", "유니클로, 티셔츠, 반팔티, uniqlo, t-shirt, tshirt", "Fashion", "JP"},
            {"Kit Kat regional flavors set", "킷캣 지역 한정 맛 세트", "キットカット ご当地", "킷캣, 킷켓, 일본 킷캣, kitkat, kit kat", "Snacks", "JP"},
            {"Tokyo-limited character plush (medium)", "도쿄 한정 캐릭터 인형 (중)", "東京限定 ぬいぐるみ", "인형, 캐릭터 인형, 봉제인형, plush, doll", "Other", "JP"},
            {"Ladurée macarons (box of 12)", "라뒤레 마카롱 (12개입)", "Ladurée macarons", "라뒤레, 라듀레, 마카롱, laduree, macaron, 프랑스 디저트", "Snacks", "FR"},
            {"Diptyque Baies candle 190g", "딥티크 베이 캔들 190g", "Diptyque bougie Baies", "딥티크, 딥디크, 캔들, 향초, diptyque, candle", "Home", "FR"},
            {"Bioderma Sensibio H2O 500ml", "바이오더마 센시비오 H2O 500ml", "Bioderma Sensibio H2O", "바이오더마, 클렌징워터, 클렌징 워터, 미셀라 워터, bioderma, micellar water", "Beauty", "FR"},
            {"Le Labo Santal 33 50ml", "르라보 상탈 33 50ml", "Le Labo Santal 33", "르라보, 상탈33, 상탈 33, 향수, le labo, perfume", "Beauty", "FR"},
            {"Mama Tom Yum instant noodles (10 pack)", "마마 똠얌 라면 (10개입)", "มาม่า ต้มยำ", "마마라면, 마마 라면, 똠얌, 똠얌꿍, 똠양꿍, 태국 라면, mama noodles, tom yum, ramen", "Food", "TH"},
            {"Naraya cotton bag", "나라야 코튼 가방", "นารายา", "나라야, 나라야 가방, 나라야 파우치, 에코백, naraya, bag", "Fashion", "TH"},
            {"Jim Thompson silk scarf", "짐 톰슨 실크 스카프", "จิม ทอมป์สัน", "짐톰슨, 짐 톰슨, 스카프, 실크 스카프, jim thompson, scarf", "Fashion", "TH"},
            {"Trader Joe's tote bag", "트레이더 조 토트백", "Trader Joe's tote bag", "트레이더조, 트레이더 조, 트레이더조 에코백, 에코백, 토트백, trader joes, tote", "Fashion", "US"},
            {"Levi's 501 Original jeans", "리바이스 501 오리지널 청바지", "Levi's 501 Original", "리바이스, 리바이스 501, 청바지, 데님, levis, jeans", "Fashion", "US"},
    };

    /** Demo offers that got a bundled photo after the first seed; older databases still hold null. */
    private static final Map<String, String> DEMO_PHOTOS = Map.ofEntries(
            Map.entry("Tokyo Banana (8 pcs)", "demo:tokyo-banana"),
            Map.entry("Royce' Nama Chocolate", "demo:royce"),
            Map.entry("Anessa Perfect UV Sunscreen 60ml", "demo:anessa"),
            Map.entry("Uniqlo Japan-limited graphic T-shirt", "demo:uniqlo-tshirt"),
            Map.entry("Kit Kat regional flavors set", "demo:kitkat"),
            Map.entry("Ladurée macarons (box of 12)", "demo:laduree"),
            Map.entry("Diptyque Baies candle 190g", "demo:diptyque-baies"),
            Map.entry("Mama Tom Yum instant noodles (10 pack)", "demo:mama-tom-yum"),
            Map.entry("Naraya cotton bag", "demo:naraya-bag"),
            Map.entry("Trader Joe's tote bag", "demo:trader-joes-tote"),
            Map.entry("Levi's 501 Original jeans", "demo:levis-501"));

    private final ProductRepository products;
    private final ProductService catalog;
    private final OfferRepository offers;
    private final RequestRepository requests;
    private final OrderRepository orders;

    public CatalogInitializer(ProductRepository products, ProductService catalog, OfferRepository offers,
                              RequestRepository requests, OrderRepository orders) {
        this.products = products;
        this.catalog = catalog;
        this.offers = offers;
        this.requests = requests;
        this.orders = orders;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        for (String[] e : STARTER_CATALOG) upsert(e);

        backfillDemoPhotos();

        List<Offer> looseOffers = offers.findByProductIsNull();
        for (Offer o : looseOffers) o.setProduct(catalog.resolve(null, o.getProductName(), o.getCategory(), o.getCountryCode()));
        List<PurchaseRequest> looseRequests = requests.findByProductIsNull();
        for (PurchaseRequest r : looseRequests) r.setProduct(catalog.resolve(null, r.getProductName(), null, r.getCountryCode()));
        List<Order> looseOrders = orders.findByProductIsNull();
        for (Order o : looseOrders) {
            Product p = o.getOffer() != null ? o.getOffer().getProduct()
                    : o.getRequest() != null ? o.getRequest().getProduct() : null;
            o.setProduct(p != null ? p : catalog.resolve(null, o.getProductName(), null, o.getCountryCode()));
        }
        if (!looseOffers.isEmpty() || !looseRequests.isEmpty() || !looseOrders.isEmpty()) {
            log.info("Catalog: linked {} offers, {} requests and {} orders to products",
                    looseOffers.size(), looseRequests.size(), looseOrders.size());
        }
    }

    private void backfillDemoPhotos() {
        int fixed = 0;
        for (Offer o : offers.findAll()) {
            String photo = DEMO_PHOTOS.get(o.getProductName());
            if (photo == null || o.getImageUrl() != null || !isDemoUser(o.getTraveler())) continue;
            o.setImageUrl(photo);
            fixed++;
        }
        for (Order o : orders.findAll()) {
            Offer offer = o.getOffer();
            if (o.getImageUrl() == null && offer != null && offer.getImageUrl() != null
                    && offer.getImageUrl().startsWith("demo:")) {
                o.setImageUrl(offer.getImageUrl());
                fixed++;
            }
        }
        if (fixed > 0) log.info("Catalog: filled in {} missing demo photos", fixed);
    }

    private static boolean isDemoUser(User u) {
        return u != null && u.getEmail() != null && u.getEmail().endsWith("@carrypick.test");
    }

    private void upsert(String[] e) {
        Product p = products.findByExactKey(ProductNames.normalize(e[0])).stream().findFirst().orElse(null);
        if (p == null) {
            products.save(new Product(e[0], e[1], e[2], e[3], e[4], e[5]));
            return;
        }
        if (p.getNameKo() == null) p.setNameKo(e[1]);
        if (p.getNameLocal() == null) p.setNameLocal(e[2]);
        if (p.getCategory() == null) p.setCategory(e[4]);
        p.addAliases(e[3]);
    }
}
