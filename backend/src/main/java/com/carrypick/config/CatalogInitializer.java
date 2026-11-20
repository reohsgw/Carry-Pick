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
            {"Tokyo Banana (8 pcs)", "도쿄 바나나 (8개입)", "東京ばな奈", "도쿄바나나, 동경바나나, 도쿄 바나나빵, tokyo banana, 東京バナナ, 일본 과자, 일본 기념품", "Food", "JP"},
            {"Royce' Nama Chocolate", "로이스 생초콜릿", "ロイズ 生チョコレート", "로이스, 로이스 초콜릿, 생초콜렛, royce, nama chocolate, 일본 초콜릿", "Food", "JP"},
            {"Anessa Perfect UV Sunscreen 60ml", "아넷사 퍼펙트 UV 선크림 60ml", "アネッサ パーフェクトUV スキンケアミルク", "아넷사, 선크림, 썬크림, 자외선 차단제, sunscreen, sunblock, 日焼け止め", "Beauty", "JP"},
            {"Uniqlo Japan-limited graphic T-shirt", "유니클로 일본 한정 그래픽 티셔츠", "ユニクロ 限定 グラフィックTシャツ", "유니클로, 티셔츠, 반팔티, uniqlo, t-shirt, tshirt", "Fashion", "JP"},
            {"Kit Kat regional flavors set", "킷캣 지역 한정 맛 세트", "キットカット ご当地", "킷캣, 킷켓, 일본 킷캣, kitkat, kit kat", "Food", "JP"},
            {"Sanrio Hello Kitty Tokyo Limited Edition", "산리오 헬로키티 도쿄 한정판", "サンリオ ハローキティ 東京限定", "헬로키티, 헬로 키티, 산리오, 키티 인형, 도쿄 한정, 인형, 캐릭터 인형, 봉제인형, hello kitty, sanrio, plush, doll", "Other", "JP"},
            {"Ladurée macarons (box of 12)", "라뒤레 마카롱 (12개입)", "Ladurée macarons", "라뒤레, 라듀레, 마카롱, laduree, macaron, 프랑스 디저트", "Food", "FR"},
            {"Diptyque Baies candle 190g", "딥티크 베이 캔들 190g", "Diptyque bougie Baies", "딥티크, 딥디크, 캔들, 향초, diptyque, candle", "Home", "FR"},
            {"Bioderma Sensibio H2O 500ml", "바이오더마 센시비오 H2O 500ml", "Bioderma Sensibio H2O", "바이오더마, 클렌징워터, 클렌징 워터, 미셀라 워터, bioderma, micellar water", "Beauty", "FR"},
            {"Le Labo Santal 33 50ml", "르라보 상탈 33 50ml", "Le Labo Santal 33", "르라보, 상탈33, 상탈 33, 향수, le labo, perfume", "Beauty", "FR"},
            {"Mama Tom Yum instant noodles (10 pack)", "마마 똠얌 라면 (10개입)", "มาม่า ต้มยำ", "마마라면, 마마 라면, 똠얌, 똠얌꿍, 똠양꿍, 태국 라면, mama noodles, tom yum, ramen", "Food", "TH"},
            {"Naraya cotton bag", "나라야 코튼 가방", "นารายา", "나라야, 나라야 가방, 나라야 파우치, 에코백, naraya, bag", "Fashion", "TH"},
            {"Jim Thompson silk scarf", "짐 톰슨 실크 스카프", "จิม ทอมป์สัน", "짐톰슨, 짐 톰슨, 스카프, 실크 스카프, jim thompson, scarf", "Fashion", "TH"},
            {"Trader Joe's tote bag", "트레이더 조 토트백", "Trader Joe's tote bag", "트레이더조, 트레이더 조, 트레이더조 에코백, 에코백, 토트백, trader joes, tote", "Fashion", "US"},
            {"Levi's 501 Original jeans", "리바이스 501 오리지널 청바지", "Levi's 501 Original", "리바이스, 리바이스 501, 청바지, 데님, levis, jeans", "Fashion", "US"},
            {"LU Véritable Petit Beurre", "LU 쁘띠 뵈르 버터 비스킷", "LU Véritable Petit Beurre", "쁘띠뵈르, 버터 비스킷, 프랑스 과자, lu biscuit", "Food", "FR"},
            {"Bonne Maman Madeleines", "본마망 마들렌", "Bonne Maman Madeleines", "본마망, 마들렌, 프랑스 과자, bonne maman", "Food", "FR"},
            {"Maille Dijon Mustard", "마이에 디종 머스타드", "Maille Moutarde de Dijon", "마이에, 디종 머스타드, 머스터드, maille, mustard", "Food", "FR"},
            {"Kusmi Tea Paris Tin", "쿠스미 티 틴케이스", "Kusmi Tea Paris", "쿠스미, 쿠스미티, 홍차, kusmi tea", "Food", "FR"},
            {"Eiffel Tower Keyring & Magnet", "파리 에펠탑 열쇠고리 & 마그넷", "Souvenir Paris", "에펠탑, 열쇠고리, 키링, 마그넷, 파리 기념품", "Other", "FR"},
            {"Trader Joe's Dark Chocolate Peanut Butter Cups", "트레이더 조 다크초콜릿 피넛버터 컵", "Trader Joe's Peanut Butter Cups", "트레이더조, 트조, 피넛버터컵, 초콜릿", "Food", "US"},
            {"Ghirardelli Chocolate Squares", "기라델리 초콜릿 스퀘어", "Ghirardelli Squares", "기라델리, 초콜릿, ghirardelli", "Food", "US"},
            {"Gentle Foaming Hand Soap", "배스앤바디웍스 젠틀 포밍 핸드솝", "Bath & Body Works Foaming Hand Soap", "배스앤바디웍스, 핸드솝, 핸드워시, bath and body works", "Beauty", "US"},
            {"Been There Series Mug", "스타벅스 비 데어 시리즈 머그", "Starbucks Been There Mug", "스타벅스 머그, 시티 머그, 머그컵, starbucks mug", "Home", "US"},
            {"Coach Corner Zip Wristlet", "코치 코너 집 리스틀릿", "Coach Corner Zip Wristlet", "코치, 파우치, 손목 지갑, coach", "Fashion", "US"},
            {"Walkers Pure Butter Shortbread", "워커스 퓨어 버터 쇼트브레드", "Walkers Shortbread", "워커스, 쇼트브레드, 버터쿠키, walkers", "Food", "GB"},
            {"Fortnum & Mason Royal Blend Tea Tin", "포트넘 앤 메이슨 로열 블렌드 홍차", "Fortnum & Mason Royal Blend", "포트넘앤메이슨, 포트넘, 홍차, 영국 홍차, fortnum", "Food", "GB"},
            {"Cadbury Dairy Milk Bar", "캐드버리 데어리 밀크 초콜릿", "Cadbury Dairy Milk", "캐드버리, 초콜릿, cadbury", "Food", "GB"},
            {"Whittard Luxury Hot Chocolate Tin", "위타드 럭셔리 핫초콜릿 틴", "Whittard Luxury Hot Chocolate", "위타드, 핫초코, 코코아, whittard", "Food", "GB"},
            {"Paddington Bear Keyring", "패딩턴 베어 키링", "Paddington Bear Keyring", "패딩턴, 곰 인형, 키링, paddington", "Other", "GB"},
            {"Bento Squid Seafood Snack", "벤또 오징어 스낵", "Bento Squid Snack", "벤또, 오징어 과자, 태국 과자, bento", "Food", "TH"},
            {"Koh-Kae Coated Peanuts", "코카 코팅 땅콩", "Koh-Kae Peanuts", "코카 땅콩, 태국 땅콩, koh kae", "Food", "TH"},
            {"ChaTraMue Thai Tea Mix", "차트라므 타이 티 믹스", "ChaTraMue Thai Tea", "차트라므, 타이티, 태국 밀크티, cha tra mue", "Food", "TH"},
            {"NaRaYa Ribbon Pouch", "나라야 리본 파우치", "NaRaYa Ribbon Pouch", "나라야, 파우치, naraya", "Fashion", "TH"},
            {"Poy-Sian Mark II Nasal Inhaler", "포이시안 마크 II 코 흡입기", "Poy-Sian Inhaler", "포이시안, 야돔, 코 흡입기, poy sian", "Beauty", "TH"},
            {"Indomie Mi Goreng (5 pack)", "인도미 미고랭 (5개입)", "Indomie Mi Goreng", "인도미, 미고랭, 라면, indomie", "Food", "ID"},
            {"Kopi Luwak Coffee 100g", "코피 루왁 커피 100g", "Kopi Luwak", "루왁 커피, 코피루왁, 커피, kopi luwak", "Food", "ID"},
            {"Pie Susu Bali", "피 수수 발리 (에그타르트)", "Pie Susu Bali", "피수수, 에그타르트, 발리 간식, pie susu", "Food", "ID"},
            {"Ellips Hair Vitamin", "엘립스 헤어 비타민", "Ellips Hair Vitamin", "엘립스, 헤어 에센스, 헤어 오일, ellips", "Beauty", "ID"},
            {"Batik Pouch", "바틱 파우치", "Batik Pouch", "바틱, 파우치, 스카프, batik", "Fashion", "ID"},
    };

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
            Map.entry("Levi's 501 Original jeans", "demo:levis-501"),
            Map.entry("Bioderma Sensibio H2O 500ml", "demo:bioderma-sensibio"),
            Map.entry("Sanrio Hello Kitty Tokyo Limited Edition", "demo:hello-kitty-tokyo"),
            Map.entry("Le Labo Santal 33 50ml", "demo:le-labo-santal33"),
            Map.entry("Jim Thompson silk scarf", "demo:jim-thompson-scarf"));

    private static final Map<String, Integer> DEMO_WEIGHTS = Map.ofEntries(
            Map.entry("Tokyo Banana (8 pcs)", 300),
            Map.entry("Royce' Nama Chocolate", 250),
            Map.entry("Anessa Perfect UV Sunscreen 60ml", 90),
            Map.entry("Uniqlo Japan-limited graphic T-shirt", 200),
            Map.entry("Kit Kat regional flavors set", 800),
            Map.entry("Sanrio Hello Kitty Tokyo Limited Edition", 150),
            Map.entry("Ladurée macarons (box of 12)", 300),
            Map.entry("Diptyque Baies candle 190g", 450),
            Map.entry("Bioderma Sensibio H2O 500ml", 560),
            Map.entry("Le Labo Santal 33 50ml", 300),
            Map.entry("Mama Tom Yum instant noodles (10 pack)", 650),
            Map.entry("Naraya cotton bag", 150),
            Map.entry("Jim Thompson silk scarf", 80),
            Map.entry("Trader Joe's tote bag", 100),
            Map.entry("LU Véritable Petit Beurre", 220),
            Map.entry("Bonne Maman Madeleines", 320),
            Map.entry("Maille Dijon Mustard", 300),
            Map.entry("Kusmi Tea Paris Tin", 180),
            Map.entry("Eiffel Tower Keyring & Magnet", 50),
            Map.entry("Trader Joe's Dark Chocolate Peanut Butter Cups", 480),
            Map.entry("Ghirardelli Chocolate Squares", 380),
            Map.entry("Gentle Foaming Hand Soap", 300),
            Map.entry("Been There Series Mug", 450),
            Map.entry("Coach Corner Zip Wristlet", 150),
            Map.entry("Walkers Pure Butter Shortbread", 280),
            Map.entry("Fortnum & Mason Royal Blend Tea Tin", 200),
            Map.entry("Cadbury Dairy Milk Bar", 120),
            Map.entry("Whittard Luxury Hot Chocolate Tin", 400),
            Map.entry("Paddington Bear Keyring", 60),
            Map.entry("Bento Squid Seafood Snack", 40),
            Map.entry("Koh-Kae Coated Peanuts", 200),
            Map.entry("ChaTraMue Thai Tea Mix", 450),
            Map.entry("NaRaYa Ribbon Pouch", 80),
            Map.entry("Poy-Sian Mark II Nasal Inhaler", 30),
            Map.entry("Indomie Mi Goreng (5 pack)", 450),
            Map.entry("Kopi Luwak Coffee 100g", 150),
            Map.entry("Pie Susu Bali", 250),
            Map.entry("Ellips Hair Vitamin", 20),
            Map.entry("Batik Pouch", 120),
            Map.entry("Levi's 501 Original jeans", 700));

    private static final Map<String, String> RENAMED = Map.of(
            "Tokyo-limited character plush (medium)", "Sanrio Hello Kitty Tokyo Limited Edition");

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
        renameDemoProducts();
        mergeSnacksIntoFood();
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
        backfillWeights();
        if (!looseOffers.isEmpty() || !looseRequests.isEmpty() || !looseOrders.isEmpty()) {
            log.info("Catalog: linked {} offers, {} requests and {} orders to products",
                    looseOffers.size(), looseRequests.size(), looseOrders.size());
        }
    }

    private void mergeSnacksIntoFood() {
        for (Product p : products.findAll()) if ("Snacks".equalsIgnoreCase(p.getCategory())) p.setCategory("Food");
        for (Offer o : offers.findAll()) if ("Snacks".equalsIgnoreCase(o.getCategory())) o.setCategory("Food");
    }

    private void renameDemoProducts() {
        RENAMED.forEach((from, to) -> {
            for (Product p : products.findAll()) if (from.equals(p.getName())) p.setName(to);
            for (PurchaseRequest r : requests.findAll()) if (from.equals(r.getProductName())) r.setProductName(to);
            for (Order o : orders.findAll()) if (from.equals(o.getProductName())) o.setProductName(to);
        });
    }

    private void backfillWeights() {
        for (Product p : products.findAll()) {
            Integer w = DEMO_WEIGHTS.get(p.getName());
            if (w != null && p.getWeightGrams() == null) p.setWeightGrams(w);
        }
        for (Offer o : offers.findAll()) {
            if (o.getWeightGrams() == null && o.getProduct() != null) o.setWeightGrams(o.getProduct().getWeightGrams());
        }
        for (PurchaseRequest r : requests.findAll()) {
            if (r.getWeightGrams() == null && r.getProduct() != null) r.setWeightGrams(r.getProduct().getWeightGrams());
        }
    }

    private void backfillDemoPhotos() {
        int fixed = 0;
        for (PurchaseRequest r : requests.findAll()) {
            String photo = DEMO_PHOTOS.get(r.getProductName());
            if (photo == null || r.getImageUrl() != null || !isDemoUser(r.getBuyer())) continue;
            r.setImageUrl(photo);
            fixed++;
        }
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
            PurchaseRequest req = o.getRequest();
            if (o.getImageUrl() == null && req != null && req.getImageUrl() != null
                    && req.getImageUrl().startsWith("demo:")) {
                o.setImageUrl(req.getImageUrl());
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
