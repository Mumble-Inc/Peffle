"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { BookmarkSimple, MagnifyingGlass, SquaresFour, List } from "@phosphor-icons/react";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { Money } from "@/components/money";
import type { PublicProduct } from "@/lib/agent/types";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "headphones", label: "Headphones" },
  { id: "earbuds", label: "Earbuds" },
  { id: "speakers", label: "Speakers" },
  { id: "accessories", label: "Accessories" },
] as const;

function matchesFilter(product: PublicProduct, filter: (typeof FILTERS)[number]["id"]) {
  if (filter === "all") return true;
  if (filter === "headphones") return product.category === "headphones";
  if (filter === "earbuds") return product.category === "earbuds";
  if (filter === "speakers") return product.category === "speaker" || product.category === "soundbar";
  return !["headphones", "earbuds", "speaker", "soundbar"].includes(product.category);
}

function typeLabel(category: string) {
  if (category === "headphones") return "Over-ear headphones";
  if (category === "earbuds") return "Wireless earbuds";
  if (category === "speaker") return "Speaker";
  if (category === "soundbar") return "Soundbar";
  if (category === "accessory") return "Accessory";
  return category;
}

export function DeskCatalogGrid({
  catalog,
  sessionId,
  cartSkus,
  highlightedSku,
  onCartChange,
}: {
  catalog: PublicProduct[];
  sessionId: string | null;
  cartSkus: Set<string>;
  highlightedSku: string | null;
  onCartChange?: () => void;
}) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"featured" | "price-asc" | "price-desc">("featured");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [saved, setSaved] = useState<Set<string>>(() => new Set());
  const [searchOpen, setSearchOpen] = useState(false);

  const products = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = catalog.filter((product) => {
      if (!matchesFilter(product, filter)) return false;
      if (!needle) return true;
      return (
        product.name.toLowerCase().includes(needle) ||
        product.blurb.toLowerCase().includes(needle) ||
        product.category.toLowerCase().includes(needle)
      );
    });
    const sorted = [...filtered];
    if (sort === "price-asc") sorted.sort((a, b) => a.pricePaise - b.pricePaise);
    else if (sort === "price-desc") sorted.sort((a, b) => b.pricePaise - a.pricePaise);
    else {
      sorted.sort((a, b) => {
        const aPrimary = a.metadata?.demoPrimary === true ? 1 : 0;
        const bPrimary = b.metadata?.demoPrimary === true ? 1 : 0;
        if (aPrimary !== bPrimary) return bPrimary - aPrimary;
        const aRole = a.metadata?.catalogRole === "primary" ? 1 : 0;
        const bRole = b.metadata?.catalogRole === "primary" ? 1 : 0;
        if (aRole !== bRole) return bRole - aRole;
        return b.pricePaise - a.pricePaise;
      });
    }
    if (highlightedSku) {
      sorted.sort((a, b) => Number(b.sku === highlightedSku) - Number(a.sku === highlightedSku));
    }
    return sorted;
  }, [catalog, filter, query, sort, highlightedSku]);

  return (
    <section id="catalog">
      <div className="rf-peffle-catalog-head">
        <div className="rf-peffle-catalog-title">
          <h2>Catalog</h2>
          <p className="rf-peffle-catalog-count">{catalog.length} products</p>
        </div>
        <div className="rf-peffle-filters">
          <button
            type="button"
            className="rf-peffle-filter-search"
            aria-label="Search catalog"
            onClick={() => setSearchOpen((open) => !open)}
          >
            <MagnifyingGlass className="size-3.5" />
          </button>
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              data-active={filter === item.id ? "true" : "false"}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="rf-peffle-catalog-tools">
          <label className="sr-only" htmlFor="desk-catalog-sort">
            Sort
          </label>
          <select
            id="desk-catalog-sort"
            value={sort}
            onChange={(event) => setSort(event.target.value as typeof sort)}
          >
            <option value="featured">Featured</option>
            <option value="price-asc">Price: low</option>
            <option value="price-desc">Price: high</option>
          </select>
          <button
            type="button"
            aria-label="Grid view"
            data-active={layout === "grid" ? "true" : "false"}
            onClick={() => setLayout("grid")}
          >
            <SquaresFour className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label="List view"
            data-active={layout === "list" ? "true" : "false"}
            onClick={() => setLayout("list")}
          >
            <List className="size-3.5" />
          </button>
        </div>
      </div>
      {searchOpen ? (
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter catalog…"
          className="mb-3 h-9 w-full max-w-sm rounded-[8px] border border-line bg-canvas-2 px-3 text-sm"
        />
      ) : null}
      {products.length === 0 ? (
        <p className="py-8 text-sm text-muted" role="status">
          No products match this filter.
        </p>
      ) : null}
      <div className="rf-peffle-product-grid" data-layout={layout}>
        {products.map((product) => {
          const primary = highlightedSku === product.sku;
          const inCart = cartSkus.has(product.sku);
          const bookmarked = saved.has(product.sku);
          return (
            <article
              key={product.sku}
              className="rf-peffle-product-card"
              data-primary={primary ? "true" : "false"}
            >
              <div className="rf-peffle-product-media">
                <Image
                  src={product.image}
                  alt={product.imageAlt}
                  width={480}
                  height={420}
                  sizes="(max-width: 760px) 45vw, 16vw"
                />
                <button
                  type="button"
                  className="rf-peffle-bookmark"
                  aria-pressed={bookmarked}
                  aria-label={bookmarked ? `Remove ${product.name} from saved` : `Save ${product.name}`}
                  onClick={() => {
                    setSaved((current) => {
                      const next = new Set(current);
                      if (next.has(product.sku)) next.delete(product.sku);
                      else next.add(product.sku);
                      return next;
                    });
                  }}
                >
                  <BookmarkSimple className="size-3.5" weight={bookmarked ? "fill" : "regular"} />
                </button>
              </div>
              <div className="rf-peffle-product-body">
                <h3 translate="no" data-testid={primary ? "product-name" : undefined}>
                  {product.name}
                </h3>
                <p className="rf-peffle-product-type">{typeLabel(product.category)}</p>
                <div className="rf-peffle-product-meta">
                  <p className="rf-peffle-product-price">
                    <Money value={product.price} />
                  </p>
                  {inCart ? (
                    <span className="text-[0.7rem] text-success">In cart</span>
                  ) : (
                    <AddToCartButton
                      sessionId={sessionId}
                      sku={product.sku}
                      label="Add"
                      inCart={inCart}
                      onAdded={onCartChange}
                      className="rf-peffle-product-add"
                    />
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
