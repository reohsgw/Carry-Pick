# CarryPick: build it yourselves

> **This copy is the finished version:** every step below is already done. README.md shows which files hold each step. Use it to compare with your own work.

This starter **runs from day one**. The structure, the design tokens and **one complete feature (Trips)** are done; everything else is left for you, in small steps. Each step says what to build, which files to touch, a few hints, and how to know you're done.

```
carrypick-starter/
├── backend/    Spring Boot 3.5, Java 21   ->  http://localhost:8080
└── frontend/   React 18 + TypeScript, Vite ->  http://localhost:5173
```

**How to use this guide**

- Do the steps **in order**. Each one builds on the one before.
- Split the work. **Dev A** takes the backend, **Dev B** the frontend, and the **designer** owns `styles.css` and screen layouts (from Figma). Agree on the JSON shape (the "DTO") at the start of each step. That shared contract lets you work in parallel.
- Use the full version we built earlier (`carrypick.zip`) as an **answer key**. Try first; only open it when you're stuck for more than 30 minutes.
- Commit to Git after every step that works. One branch per step is a good habit.

---

## How a feature travels through the code

Every feature follows the same path. Trips is the complete example; open these files side by side:

```
 Browser (React)                                  Server (Spring Boot)                     Database
 ───────────────                                  ────────────────────                     ────────
 pages/Trips.tsx  ──>  api.ts                ──>  web/TripController.java   (URL, JSON)
   useQuery / useMutation  api.createTrip()  HTTP   service/TripService.java  (rules)
                                             JSON   repo/TripRepository.java  (queries)  ──>  trip table
                                                    domain/Trip.java          (@Entity)
```

| Layer | Its one job | Trips example |
|---|---|---|
| Entity | What a table row looks like | `domain/Trip.java` |
| Repository | Read and write rows (Spring writes the SQL) | `repo/TripRepository.java` |
| Service | Business rules, e.g. "return date must be after departure" | `service/TripService.java` |
| Controller | URL + JSON in/out (DTO records) | `web/TripController.java` |
| api.ts | TypeScript copy of the DTO + one function per URL | `frontend/src/api.ts` |
| Page | Shows data, sends forms | `frontend/src/pages/Trips.tsx` |

For every new feature, copy these six files' patterns.

---

## Step 0: Run it (everyone, 30 min)

**Goal:** both servers run and talk to each other.

1. Install **Java 21**, **Node 20+**, and IntelliJ (it includes Maven) or Maven itself.
2. Terminal 1: `cd backend` then `mvn spring-boot:run`. Wait for `Started CarryPickApplication`.
3. Terminal 2: `cd frontend`, then `npm install`, then `npm run dev`.
4. Open <http://localhost:5173>.

**Done when:** the home page shows a green **"Backend connected (ok)"**. Also open <http://localhost:8080/h2-console> (JDBC URL `jdbc:h2:mem:carrypick`, user `sa`, no password) and run `select * from trip;`.

> If port 8080 is busy (Jenkins…): `PORT=8081 mvn spring-boot:run` and `API_PORT=8081 npm run dev`.

## Step 1: Read the Trips example (everyone, 1 h)

**Goal:** understand one feature from button to database before writing your own.

- Open **Trips** in the app, save a trip, then find it in the H2 console.
- Try a return date **before** the departure date. Then find the line in `TripService.java` that rejected it, and the place in `Trips.tsx` that shows the message.
- Change one thing and watch it update. For example, make `luggageNote` required: add `@NotBlank` in `TripForm`, restart the backend, try again.

**Done when:** each of you can explain the arrows in the diagram above, out loud, to the others.

## Step 2: Offers, B2 (Dev A + Dev B, 1–2 days)

**Goal:** a traveler's offer ("I can bring Tokyo Banana, ₩12,000 + ₩4,000 reward") and the list of offers for one country.

- **Dev A, backend**
  - Fill in the fields in `domain/Offer.java` (the comment lists them) and make `OfferStatus.java`.
  - Add `repo/OfferRepository.java` with `findByTripCountryCodeAndStatus(String code, OfferStatus status)`. Remember `@EntityGraph`; see the note in `TripRepository`.
  - Add `web/OfferController.java` with `GET /api/offers?country=JP` and `POST /api/offers`. Return an `OfferDto` record, never the entity.
  - Seed 3–4 offers in `DataSeeder`.
- **Dev B, frontend**
  - Add the `Offer` type and `api.offers(country)` in `api.ts`.
  - Create `pages/CountryOffers.tsx` (copy `Trips.tsx`) and read the country with `useParams()`.
  - Build the offer card from Figma: route chip, Price / Reward / Arrives, traveler.

**Done when:** Home → Japan shows the seeded offers as cards.

## Step 3: Pricing rule (Dev A, 2 h)

**Goal:** the buyer's total = item + reward + 10% fee + estimated tax over ₩150,000.

- Finish `service/PricingService.java`.
- Run `mvn test -Dtest=PricingServiceTest` until all 4 tests pass. They're written for you; read them first.

**Done when:** the tests are green. This is also great to show in the presentation: "our pricing has unit tests".

## Step 4: Offer detail + home sections, B4/B1 (Dev B, 1–2 days)

**Goal:** tapping an offer shows its detail and a price summary with every amount on its own line.

- Backend (Dev A, small): `GET /api/offers/{id}`, and add the quote from PricingService to `OfferDto`.
- Frontend: `pages/OfferDetail.tsx` with a quantity stepper and the price summary.
- Home: the "Most wanted" and "Already coming your way" sections from Figma, using real offers.

**Done when:** the total on screen matches the test numbers. For example ₩12,000 + ₩4,000 gives a total of ₩17,600.

## Step 5: Purchase requests, B5/T5/T6 (1–2 days)

**Goal:** a buyer posts "I want X, budget ₩30,000, by Nov 27", and travelers going there see it.

- **Backend**
  - Fill in `PurchaseRequest.java` and `RequestStatus`, plus a repository and a controller.
  - `GET /api/requests/open?travelerId=` returns only OPEN requests for countries in that traveler's trips, where the deadline is **after** the trip's return date. Write this rule in a service and test it.
- **Frontend**
  - `NewRequest.tsx` is the form.
  - `RequestBoard.tsx` holds the request cards.

**Done when:** the buyer posts a request and the traveler (Kenji) sees it. A buyer must **not** see their own request.

## Step 6: Orders and the status machine (2–3 days, the core of the app)

**Goal:** booking an offer or accepting a request creates an **order** that moves through `OrderStatus`.

1. **Draw the state diagram** from the comment in `OrderStatus.java` on paper, together.
2. Fill in `Order.java`, then write `OrderService` **one method at a time**, in the order listed in its comment. Each method checks:
   - **who** is calling (buyer or traveler of this order);
   - the **current status**;
   - then it changes the status and the timestamp.
3. Write a test per move, at least: `book → PAID → PURCHASED → DELIVERED → SETTLED`, and "price over budget → AWAITING_APPROVAL".
4. Frontend: `MyOrders.tsx` and `OrderDetail.tsx`. Which buttons appear depends on **who you are + the status**.

For now, "pay" is a button that calls `markPaid`. Real payment comes in step 8.

**Done when:** you can play a full order with two browser tabs (buyer tab, traveler tab) from booking to "settled".

## Step 7: Login with JWT (Dev A + Dev B, 1–2 days)

**Goal:** real accounts. Remove every `travelerId: 2` and `?travelerId=` you used so far.

- **Backend**
  - `POST /api/auth/signup` and `POST /api/auth/login`. Hash passwords with `BCryptPasswordEncoder`.
  - Login returns a **JWT** made with the `jjwt` library (already in `pom.xml`).
  - Add a filter that reads `Authorization: Bearer <token>` and sets the current user.
  - In `SecurityConfig`, require login for everything except health, auth and public GETs.
  - Controllers get the user from the token instead of from the body.
- **Frontend**
  - Login page; save the token in `sessionStorage` so each tab can be a different user.
  - Add the axios interceptor (TODO in `api.ts`); on a 401 response, go to `/login`.

**Done when:**
- Calling `POST /api/trips` without a token returns **401**.
- A buyer can't open another buyer's order (**403**).

## Step 8: Payments (1–2 days)

**Goal:** paying moves the order to PAID, with no real money.

1. **Mock first:** a fake card sheet with "Approve" and "Decline" buttons. Decline sets PAYMENT_FAILED, and retry must work.
2. **Then Toss Payments test mode:**
   - Get the **API 개별 연동 키** (individual API keys) from developers.tosspayments.com.
   - The server decides the amount (`prepare`), the browser opens Toss, and Toss redirects back.
   - The server checks the amount again and calls Toss confirm with the **secret key**, which stays only on the server.

**Done when:**
- A test payment marks the order PAID.
- Changing the amount in the browser is rejected by the server.

## Step 9: Receipt upload + over-budget approval (1 day)

**Goal:** the traveler uploads a receipt photo and the real price.

- If the price is over budget, the order goes to AWAITING_APPROVAL. The buyer approves (and pays the extra) or rejects (cancel + refund).
- Save files to an `uploads/` folder. Accept images/PDF only, max 10 MB.

**Optional:** an AI receipt reader that sends the photo to a vision model on the **server** and pre-fills the price.

## Step 10: Polish (designer-led, ongoing)

- Match every screen to Figma. Put colors only in `styles.css` variables.
- Empty states ("No orders yet" plus a button), loading and error messages on every screen.
- **Optional:** a Korean/English toggle, notifications, the sparkle cursor trail from the Figma file.
- Rehearse the demo: two tabs, buyer and traveler, one full order in under 3 minutes.

---

## When you're stuck

- **Backend error?** Read the **first** red line in the terminal, not the last one.
  - `LazyInitializationException` → add `@EntityGraph`, see TripRepository.
  - `Table not found` → the entity is missing `@Entity`.
- **Frontend shows "Cannot reach the server"?** The backend isn't running, or it's on another port.
- **400 VALIDATION?** The message names the field that's wrong.
- **401/403 after step 7?** The token isn't being sent, or you're the wrong user for that order.
- Test the backend without the frontend at <http://localhost:8080/swagger-ui.html>.
- Ask me with the exact error message and the file you're in. I'll explain instead of writing it for you if you prefer.
