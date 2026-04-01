CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"vehicle_type" varchar(100) NOT NULL,
	"description" text DEFAULT '',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name"),
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "category_filter_map" (
	"category_id" integer NOT NULL,
	"filter_id" integer NOT NULL,
	CONSTRAINT "category_filter_map_category_id_filter_id_pk" PRIMARY KEY("category_id","filter_id")
);
--> statement-breakpoint
CREATE TABLE "filter_definitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(100) NOT NULL,
	"label" varchar(100) NOT NULL,
	"type" varchar(20) NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "filter_definitions_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer,
	"listing_code" varchar(50) NOT NULL,
	"title" varchar(300) NOT NULL,
	"brand" varchar(100) NOT NULL,
	"model" varchar(100) NOT NULL,
	"variant" varchar(200) DEFAULT '',
	"model_year" integer,
	"registration_year" integer,
	"vehicle_type" varchar(50),
	"body_style" varchar(50),
	"exterior_color" varchar(50),
	"interior_color" varchar(50),
	"listing_price_inr" integer DEFAULT 0 NOT NULL,
	"negotiable" boolean DEFAULT false NOT NULL,
	"estimated_market_value_inr" integer,
	"ownership_type" varchar(20),
	"seller_type" varchar(30),
	"registration_state" varchar(100),
	"registration_city" varchar(100),
	"total_km_driven" integer,
	"mileage_kmpl" real,
	"engine_type" varchar(100),
	"engine_capacity_cc" integer,
	"power_bhp" integer,
	"transmission_type" varchar(20),
	"fuel_type" varchar(20),
	"battery_capacity_kwh" real,
	"overall_condition_rating" real,
	"service_history_available" boolean DEFAULT false,
	"airbags_count" integer,
	"infotainment_screen_size" varchar(20),
	"location_city" varchar(100),
	"location_state" varchar(100),
	"dealer_rating" real,
	"inspection_status" varchar(30),
	"inspection_score" real,
	"listing_status" varchar(20) DEFAULT 'Active' NOT NULL,
	"featured_listing" boolean DEFAULT false NOT NULL,
	"is_splus" boolean DEFAULT false NOT NULL,
	"is_new_car" boolean DEFAULT false NOT NULL,
	"new_car_type" varchar(30),
	"views_count" integer DEFAULT 0,
	"favorites_count" integer DEFAULT 0,
	"lead_count" integer DEFAULT 0,
	"promotion_tier" varchar(20),
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"interior_images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"exterior_images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"engine_images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tire_images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"damage_images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"additional_notes" text,
	"specs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "listings_listing_code_unique" UNIQUE("listing_code")
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"refresh_token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_refresh_token_unique" UNIQUE("refresh_token")
);
--> statement-breakpoint
CREATE TABLE "site_config" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"value" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_drive_bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"listing_id" integer NOT NULL,
	"car_title" varchar(300) DEFAULT '' NOT NULL,
	"name" varchar(200) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"email" varchar(255),
	"preferred_date" varchar(20),
	"preferred_time" varchar(20),
	"location_preference" varchar(20) DEFAULT 'hub',
	"notes" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_favorites" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"listing_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255),
	"phone" varchar(20),
	"name" varchar(200) DEFAULT '' NOT NULL,
	"password_hash" text,
	"role" varchar(10) DEFAULT 'user' NOT NULL,
	"google_id" varchar(255),
	"phone_verified" boolean DEFAULT false NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"avatar_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone"),
	CONSTRAINT "users_google_id_unique" UNIQUE("google_id")
);
--> statement-breakpoint
ALTER TABLE "category_filter_map" ADD CONSTRAINT "category_filter_map_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_filter_map" ADD CONSTRAINT "category_filter_map_filter_id_filter_definitions_id_fk" FOREIGN KEY ("filter_id") REFERENCES "public"."filter_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_drive_bookings" ADD CONSTRAINT "test_drive_bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_drive_bookings" ADD CONSTRAINT "test_drive_bookings_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_listings_brand" ON "listings" USING btree ("brand");--> statement-breakpoint
CREATE INDEX "idx_listings_location_city" ON "listings" USING btree ("location_city");--> statement-breakpoint
CREATE INDEX "idx_listings_listing_status" ON "listings" USING btree ("listing_status");--> statement-breakpoint
CREATE INDEX "idx_listings_price" ON "listings" USING btree ("listing_price_inr");--> statement-breakpoint
CREATE INDEX "idx_listings_category" ON "listings" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_listings_featured" ON "listings" USING btree ("featured_listing") WHERE featured_listing = true;--> statement-breakpoint
CREATE INDEX "idx_listings_splus" ON "listings" USING btree ("is_splus") WHERE is_splus = true;--> statement-breakpoint
CREATE INDEX "idx_listings_search" ON "listings" USING gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(brand, '') || ' ' || coalesce(model, '') || ' ' || coalesce(location_city, '')));--> statement-breakpoint
CREATE UNIQUE INDEX "user_favorites_user_listing_idx" ON "user_favorites" USING btree ("user_id","listing_id");