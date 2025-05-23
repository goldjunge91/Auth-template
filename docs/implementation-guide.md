# Next.js TypeScript Implementierungsleitfaden

Dieser Leitfaden beschreibt die Implementierung von Server Actions und URL-basierten States/Suchen in einer Next.js TypeScript React-Anwendung.

## Inhaltsverzeichnis

1. [Projektübersicht](#projektübersicht)
2. [Server Actions](#server-actions)
   - [Was sind Server Actions?](#was-sind-server-actions)
   - [Implementierung von Server Actions](#implementierung-von-server-actions)
   - [Best Practices](#best-practices-für-server-actions)
3. [URL-basierte States und Suchen](#url-basierte-states-und-suchen)
   - [Suchparameter verwenden](#suchparameter-verwenden)
   - [Filterung und Sortierung mit URL-Parametern](#filterung-und-sortierung-mit-url-parametern)
   - [URL-State mit useSearchParams](#url-state-mit-usesearchparams)
4. [Implementierungsbeispiele](#implementierungsbeispiele)
   - [Produktsuche mit Filtern](#produktsuche-mit-filtern)
   - [Paginierung](#paginierung)
   - [Formularverarbeitung mit Server Actions](#formularverarbeitung-mit-server-actions)
5. [Performance-Optimierungen](#performance-optimierungen)
6. [Typsicherheit](#typsicherheit)

## Projektübersicht

Diese Dokumentation bezieht sich auf ein Next.js 15.3.2 Projekt mit:
- React 19
- TypeScript
- TailwindCSS 4
- App Router Architektur

## Server Actions

### Was sind Server Actions?

Server Actions sind eine Funktion von Next.js, die es ermöglicht, serverseitige Funktionen direkt aus Clientkomponenten aufzurufen. Sie bieten eine einfache Möglichkeit, Formulardaten zu verarbeiten, Datenbankoperationen durchzuführen und andere serverseitige Logik auszuführen, ohne eine separate API erstellen zu müssen.

Wichtige Vorteile:
- Progressives Enhancement (funktioniert auch ohne JavaScript)
- Nahtlose Integration mit React-Komponenten
- Automatische Validierung und Fehlerbehandlung
- Optimierte Leistung durch Vermeidung von Client-Server-Roundtrips

### Implementierung von Server Actions

Server Actions können auf zwei Arten implementiert werden:

1. **In einer Server-Komponente**:

```typescript
// app/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createItem(formData: FormData) {
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;

  // Hier Datenbank-Logik einfügen
  // z.B. mit Prisma: await prisma.item.create({ data: { name, description } })

  // Cache aktualisieren und umleiten
  revalidatePath('/items');
  redirect('/items');
}
```

2. **In einer Client-Komponente mit "use server" Direktive**:

```typescript
// app/components/ItemForm.tsx
'use client';

import { useRef } from 'react';

export default function ItemForm() {
  const formRef = useRef<HTMLFormElement>(null);

  async function createItem(formData: FormData) {
    'use server';
    
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;

    // Datenbank-Logik hier
    
    formRef.current?.reset();
  }

  return (
    <form action={createItem} ref={formRef}>
      <input type="text" name="name" required />
      <textarea name="description" required></textarea>
      <button type="submit">Erstellen</button>
    </form>
  );
}
```

### Best Practices für Server Actions

1. **Sicherheit**: Validieren Sie immer Eingabedaten, bevor Sie sie verarbeiten.

```typescript
// Mit zod für Typsicherheit und Validierung
import { z } from 'zod';

const ItemSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().min(10).max(1000),
});

export async function createItem(formData: FormData) {
  'use server';
  
  const result = ItemSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
  });

  if (!result.success) {
    // Fehlerbehandlung
    return { error: result.error.format() };
  }

  // Erfolgreiche Validierung, Daten verarbeiten
  const { name, description } = result.data;
  // ...
}
```

2. **Fehlerbehandlung**: Implementieren Sie robuste Fehlerbehandlung für Server Actions.

```typescript
export async function createItem(formData: FormData) {
  'use server';
  
  try {
    // Datenverarbeitung
    return { success: true };
  } catch (error) {
    console.error('Fehler beim Erstellen:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
    };
  }
}
```

3. **Optimistische Updates**: Verbessern Sie die Benutzererfahrung mit optimistischen Updates.

```typescript
'use client';

import { experimental_useOptimistic as useOptimistic } from 'react';
import { createItem } from '@/app/actions';

export function ItemList({ items }) {
  const [optimisticItems, addOptimisticItem] = useOptimistic(
    items,
    (state, newItem) => [...state, newItem]
  );

  async function handleCreateItem(formData: FormData) {
    const name = formData.get('name') as string;
    
    // Optimistisches Update
    addOptimisticItem({ id: 'temp-id', name, status: 'pending' });
    
    // Tatsächliche Aktion ausführen
    await createItem(formData);
  }

  return (
    <div>
      <form action={handleCreateItem}>
        {/* Formularfelder */}
      </form>
      <ul>
        {optimisticItems.map(item => (
          <li key={item.id}>{item.name} {item.status === 'pending' && '(Wird gespeichert...)'}</li>
        ))}
      </ul>
    </div>
  );
}
```

## URL-basierte States und Suchen

### Suchparameter verwenden

Next.js bietet Hooks und Utility-Funktionen, um mit URL-Parametern zu arbeiten und den Anwendungszustand in der URL zu speichern.

#### Client-seitige Implementierung

```typescript
// app/components/SearchComponent.tsx
'use client';

import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';

export default function SearchComponent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  
  // Aktuellen Suchbegriff aus der URL holen
  const currentQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(currentQuery);

  // Handler, um die URL zu aktualisieren
  const handleSearch = useCallback(() => {
    // Neue SearchParams erstellen
    const params = new URLSearchParams(searchParams);
    
    if (query) {
      params.set('q', query);
    } else {
      params.delete('q');
    }
    
    // URL aktualisieren ohne Neuladen der Seite
    router.push(`${pathname}?${params.toString()}`);
  }, [query, searchParams, pathname, router]);

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Suchen..."
      />
      <button onClick={handleSearch}>Suchen</button>
    </div>
  );
}
```

#### Server-seitige Implementierung

```typescript
// app/search/page.tsx
import { Suspense } from 'react';
import SearchComponent from '@/app/components/SearchComponent';
import SearchResults from '@/app/components/SearchResults';

export default function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string };
}) {
  const query = searchParams.q || '';
  const page = Number(searchParams.page) || 1;

  return (
    <div>
      <h1>Suche</h1>
      <SearchComponent />
      <Suspense fallback={<div>Lade Ergebnisse...</div>}>
        <SearchResults query={query} page={page} />
      </Suspense>
    </div>
  );
}
```

### Filterung und Sortierung mit URL-Parametern

Für komplexere Filterungen und Sortierungen können mehrere URL-Parameter verwendet werden.

```typescript
// app/products/page.tsx
import ProductFilters from '@/app/components/ProductFilters';
import ProductList from '@/app/components/ProductList';
import { Suspense } from 'react';

export default function ProductsPage({
  searchParams,
}: {
  searchParams: {
    category?: string;
    price?: string;
    sort?: string;
    page?: string;
  };
}) {
  const { category, price, sort, page } = searchParams;
  
  return (
    <div>
      <h1>Produkte</h1>
      <ProductFilters 
        currentCategory={category} 
        currentPrice={price} 
        currentSort={sort} 
      />
      <Suspense fallback={<div>Lade Produkte...</div>}>
        <ProductList 
          category={category}
          price={price}
          sort={sort}
          page={Number(page) || 1}
        />
      </Suspense>
    </div>
  );
}
```

### URL-State mit useSearchParams

Der `useSearchParams` Hook kann verwendet werden, um URL-Parameter in Client-Komponenten zu lesen und zu aktualisieren.

```typescript
// app/components/ProductFilters.tsx
'use client';

import { useSearchParams, usePathname, useRouter } from 'next/navigation';

export default function ProductFilters({
  currentCategory,
  currentPrice,
  currentSort,
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  function handleFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    
    // Bei Filteränderung zur ersten Seite zurückkehren
    params.delete('page');
    
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="filters">
      <select 
        value={currentCategory || ''}
        onChange={(e) => handleFilter('category', e.target.value)}
      >
        <option value="">Alle Kategorien</option>
        <option value="electronics">Elektronik</option>
        <option value="clothing">Kleidung</option>
        {/* Weitere Optionen */}
      </select>
      
      <select 
        value={currentPrice || ''}
        onChange={(e) => handleFilter('price', e.target.value)}
      >
        <option value="">Alle Preise</option>
        <option value="under-50">Unter 50€</option>
        <option value="50-100">50€ - 100€</option>
        <option value="over-100">Über 100€</option>
      </select>
      
      <select 
        value={currentSort || 'newest'}
        onChange={(e) => handleFilter('sort', e.target.value)}
      >
        <option value="newest">Neueste</option>
        <option value="price-asc">Preis: Aufsteigend</option>
        <option value="price-desc">Preis: Absteigend</option>
      </select>
    </div>
  );
}
```

## Implementierungsbeispiele

### Produktsuche mit Filtern

Hier ist ein vollständiges Beispiel für eine Produktsuche mit Filtern, die URL-Parameter und Server Actions kombiniert:

1. **Server Action für Produktsuche**:

```typescript
// app/actions/product.ts
'use server';

import { unstable_cache } from 'next/cache';

export type Product = {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string;
};

type ProductFilter = {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'newest' | 'price-asc' | 'price-desc';
  page?: number;
  limit?: number;
};

// Cache die Suchergebnisse für bessere Performance
export const searchProducts = unstable_cache(
  async (filters: ProductFilter) => {
    const { category, minPrice, maxPrice, sort, page = 1, limit = 10 } = filters;
    
    // Hier die Datenbankabfrage einfügen
    // Beispiel: Simulierte Daten
    const allProducts: Product[] = [
      // Produktdaten
    ];
    
    // Filterlogik anwenden
    let filteredProducts = [...allProducts];
    
    if (category) {
      filteredProducts = filteredProducts.filter(p => p.category === category);
    }
    
    if (minPrice !== undefined) {
      filteredProducts = filteredProducts.filter(p => p.price >= minPrice);
    }
    
    if (maxPrice !== undefined) {
      filteredProducts = filteredProducts.filter(p => p.price <= maxPrice);
    }
    
    // Sortierung
    if (sort) {
      filteredProducts.sort((a, b) => {
        if (sort === 'price-asc') return a.price - b.price;
        if (sort === 'price-desc') return b.price - a.price;
        // Standardsortierung: neueste
        return 0; // In einer realen App würde hier nach Datum sortiert
      });
    }
    
    // Paginierung
    const totalItems = filteredProducts.length;
    const totalPages = Math.ceil(totalItems / limit);
    const offset = (page - 1) * limit;
    const paginatedProducts = filteredProducts.slice(offset, offset + limit);
    
    return {
      products: paginatedProducts,
      pagination: {
        total: totalItems,
        totalPages,
        currentPage: page,
        limit,
      },
    };
  },
  // Cache-Key-Generatorfunktion
  ['products'],
  // Cacheoption: 1 Minute TTL
  { revalidate: 60 }
);
```

2. **Produktlistenseite**:

```typescript
// app/products/page.tsx
import { Suspense } from 'react';
import { searchProducts } from '@/app/actions/product';
import ProductFilters from '@/app/components/ProductFilters';
import ProductList from '@/app/components/ProductList';
import Pagination from '@/app/components/Pagination';

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: {
    category?: string;
    price?: string;
    sort?: 'newest' | 'price-asc' | 'price-desc';
    page?: string;
  };
}) {
  const { category, price, sort, page } = searchParams;
  
  // URL-Parameter in Filteroptionen umwandeln
  const priceRange = price ? parsePrice(price) : {};
  const currentPage = Number(page) || 1;
  
  // Produkte mit Server Action abrufen
  const { products, pagination } = await searchProducts({
    category,
    ...priceRange,
    sort,
    page: currentPage,
    limit: 12,
  });
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Produkte</h1>
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-3">
          <ProductFilters 
            currentCategory={category} 
            currentPrice={price} 
            currentSort={sort} 
          />
        </div>
        
        <div className="col-span-9">
          <ProductList products={products} />
          
          <Pagination 
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
          />
        </div>
      </div>
    </div>
  );
}

// Hilfsfunktion, um Preisfilter zu parsen
function parsePrice(priceFilter: string): { minPrice?: number; maxPrice?: number } {
  switch (priceFilter) {
    case 'under-50':
      return { maxPrice: 50 };
    case '50-100':
      return { minPrice: 50, maxPrice: 100 };
    case 'over-100':
      return { minPrice: 100 };
    default:
      return {};
  }
}
```

3. **Paginierungskomponente**:

```typescript
// app/components/Pagination.tsx
'use client';

import { useSearchParams, usePathname, useRouter } from 'next/navigation';

type PaginationProps = {
  currentPage: number;
  totalPages: number;
};

export default function Pagination({ currentPage, totalPages }: PaginationProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  function handlePageChange(newPage: number) {
    if (newPage < 1 || newPage > totalPages) return;
    
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    
    router.push(`${pathname}?${params.toString()}`);
  }

  // Berechnen, welche Seiten angezeigt werden sollen
  const pagesToShow = getPagesToShow(currentPage, totalPages);

  return (
    <div className="flex items-center justify-center mt-8">
      <button
        className="px-3 py-1 rounded border disabled:opacity-50"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        Zurück
      </button>
      
      {pagesToShow.map((page, i) => (
        page === '...' ? (
          <span key={`ellipsis-${i}`} className="px-3 py-1">...</span>
        ) : (
          <button
            key={page}
            className={`px-3 py-1 rounded mx-1 ${currentPage === page ? 'bg-blue-500 text-white' : 'border'}`}
            onClick={() => handlePageChange(page as number)}
          >
            {page}
          </button>
        )
      ))}
      
      <button
        className="px-3 py-1 rounded border disabled:opacity-50"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Weiter
      </button>
    </div>
  );
}

// Hilfsfunktion für Pagination-UI
function getPagesToShow(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  
  if (currentPage <= 3) {
    return [1, 2, 3, 4, '...', totalPages - 1, totalPages];
  }
  
  if (currentPage >= totalPages - 2) {
    return [1, 2, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  
  return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
}
```

### Formularverarbeitung mit Server Actions

Hier ist ein Beispiel für ein Kontaktformular mit Server Actions und Validierung:

1. **Server Action für das Kontaktformular**:

```typescript
// app/actions/contact.ts
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// Validierungsschema
const ContactSchema = z.object({
  name: z.string().min(2, 'Name muss mindestens 2 Zeichen haben'),
  email: z.string().email('Ungültige E-Mail-Adresse'),
  message: z.string().min(10, 'Nachricht muss mindestens 10 Zeichen haben'),
});

type ContactForm = z.infer<typeof ContactSchema>;

type ContactActionResult = {
  success: boolean;
  errors?: {
    name?: string[];
    email?: string[];
    message?: string[];
  };
};

export async function submitContactForm(prevState: any, formData: FormData): Promise<ContactActionResult> {
  // Daten aus dem Formular extrahieren
  const rawData = {
    name: formData.get('name'),
    email: formData.get('email'),
    message: formData.get('message'),
  };
  
  // Validierung
  const validationResult = ContactSchema.safeParse(rawData);
  
  if (!validationResult.success) {
    // Fehler im Format für das Formular aufbereiten
    return {
      success: false,
      errors: validationResult.error.format(),
    };
  }
  
  // Validierte Daten
  const data = validationResult.data;
  
  try {
    // Hier die Logik zum Speichern/Senden der Nachricht einfügen
    // z.B. E-Mail versenden oder in Datenbank speichern
    
    // Simuliere asynchrone Operation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Bei Erfolg zur Bestätigungsseite weiterleiten
    revalidatePath('/contact');
    redirect('/contact/success');
  } catch (error) {
    console.error('Fehler beim Verarbeiten des Kontaktformulars:', error);
    
    return {
      success: false,
      errors: {
        message: ['Ein Serverfehler ist aufgetreten. Bitte versuchen Sie es später erneut.'],
      },
    };
  }
}
```

2. **Kontaktformular-Komponente**:

```typescript
// app/contact/page.tsx
'use client';

import { useFormState } from 'react-dom';
import { submitContactForm } from '@/app/actions/contact';

const initialState = {
  success: false,
  errors: {},
};

export default function ContactPage() {
  const [state, formAction] = useFormState(submitContactForm, initialState);

  return (
    <div className="max-w-md mx-auto py-12">
      <h1 className="text-2xl font-bold mb-6">Kontaktformular</h1>
      
      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="name" className="block mb-1">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            className="w-full px-3 py-2 border rounded"
            aria-describedby={state.errors?.name ? 'name-error' : undefined}
          />
          {state.errors?.name && (
            <p id="name-error" className="text-red-500 text-sm mt-1">
              {state.errors.name}
            </p>
          )}
        </div>
        
        <div>
          <label htmlFor="email" className="block mb-1">
            E-Mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className="w-full px-3 py-2 border rounded"
            aria-describedby={state.errors?.email ? 'email-error' : undefined}
          />
          {state.errors?.email && (
            <p id="email-error" className="text-red-500 text-sm mt-1">
              {state.errors.email}
            </p>
          )}
        </div>
        
        <div>
          <label htmlFor="message" className="block mb-1">
            Nachricht
          </label>
          <textarea
            id="message"
            name="message"
            rows={5}
            className="w-full px-3 py-2 border rounded"
            aria-describedby={state.errors?.message ? 'message-error' : undefined}
          ></textarea>
          {state.errors?.message && (
            <p id="message-error" className="text-red-500 text-sm mt-1">
              {state.errors.message}
            </p>
          )}
        </div>
        
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Nachricht senden
        </button>
      </form>
    </div>
  );
}
```

3. **Erfolgsseite**:

```typescript
// app/contact/success/page.tsx
import Link from 'next/link';

export default function ContactSuccessPage() {
  return (
    <div className="max-w-md mx-auto py-12 text-center">
      <h1 className="text-2xl font-bold mb-4">Vielen Dank!</h1>
      <p className="mb-6">
        Ihre Nachricht wurde erfolgreich gesendet. Wir werden uns so schnell wie möglich bei Ihnen melden.
      </p>
      <Link
        href="/"
        className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Zurück zur Startseite
      </Link>
    </div>
  );
}
```

## Performance-Optimierungen

Hier sind einige Strategien zur Optimierung der Performance:

1. **Serverseitiges Caching**:

```typescript
// app/actions/data.ts
'use server';

import { unstable_cache } from 'next/cache';

export const getProductData = unstable_cache(
  async (productId: string) => {
    // Datenbankabfrage
    return { /* Produktdaten */ };
  },
  ['product-data'],
  { revalidate: 60 } // Cache für 60 Sekunden
);
```

2. **React Suspense für Ladezustände**:

```typescript
// app/products/[id]/page.tsx
import { Suspense } from 'react';
import ProductDetail from '@/app/components/ProductDetail';
import ProductSkeleton from '@/app/components/ProductSkeleton';

export default function ProductPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <Suspense fallback={<ProductSkeleton />}>
        <ProductDetail id={params.id} />
      </Suspense>
    </div>
  );
}
```

3. **Parallelisierung von Anfragen**:

```typescript
// app/dashboard/page.tsx
import { Suspense } from 'react';
import { getRecentOrders, getPopularProducts, getUserStats } from '@/app/actions/dashboard';

export default async function DashboardPage() {
  // Parallele Anfragen
  const [ordersPromise, productsPromise, statsPromise] = await Promise.all([
    getRecentOrders(),
    getPopularProducts(),
    getUserStats(),
  ]);

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-8">
        <Suspense fallback={<div>Lade Bestellungen...</div>}>
          <RecentOrdersSection ordersPromise={ordersPromise} />
        </Suspense>
      </div>
      
      <div className="col-span-4">
        <Suspense fallback={<div>Lade Produkte...</div>}>
          <PopularProductsSection productsPromise={productsPromise} />
        </Suspense>
        
        <Suspense fallback={<div>Lade Statistiken...</div>}>
          <StatsSection statsPromise={statsPromise} />
        </Suspense>
      </div>
    </div>
  );
}
```

## Typsicherheit

Next.js mit TypeScript bietet verschiedene Möglichkeiten, Typsicherheit in der Anwendung zu gewährleisten:

1. **Typisierte Server Actions**:

```typescript
// app/actions/user.ts
'use server';

import { z } from 'zod';

const UserSchema = z.object({
  username: z.string().min(3).max(20),
  email: z.string().email(),
  age: z.number().int().positive().optional(),
});

type User = z.infer<typeof UserSchema>;

export async function createUser(data: User): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    // Validierung
    const validatedData = UserSchema.parse(data);
    
    // Nutzer erstellen
    // const user = await db.user.create({ data: validatedData });
    
    return { success: true, id: 'user-id' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Validierungsfehler' };
    }
    
    return { success: false, error: 'Serverfehler' };
  }
}
```

2. **Typisierte Routen-Handler**:

```typescript
// app/api/products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const ProductQuerySchema = z.object({
  category: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  sort: z.enum(['newest', 'price-asc', 'price-desc']).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Konvertiere SearchParams in ein Objekt
    const queryParams: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });
    
    // Validiere und transformiere die Query-Parameter
    const validatedParams = ProductQuerySchema.parse(queryParams);
    
    // Datenbankabfrage mit validierten Parametern
    // const products = await getProducts(validatedParams);
    
    return NextResponse.json({ products: [] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Ungültige Anfrageparameter', details: error.format() },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Serverfehler' },
      { status: 500 }
    );
  }
}
```

3. **Typisierte Suchparameter**:

```typescript
// app/lib/types.ts
export type SearchParams = {
  q?: string;
  category?: string;
  price?: string;
  sort?: 'newest' | 'price-asc' | 'price-desc';
  page?: string;
};

// app/products/page.tsx
import { SearchParams } from '@/app/lib/types';

export default function ProductsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // Typsichere Verarbeitung der Suchparameter
  const { q, category, price, sort, page } = searchParams;
  // ...
}
```

4. **Typisierte Formulare**:

```typescript
// app/components/TypedForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Validierungsschema
const FormSchema = z.object({
  title: z.string().min(5).max(100),
  content: z.string().min(20),
  tags: z.array(z.string()).min(1),
  published: z.boolean().default(false),
});

type FormData = z.infer<typeof FormSchema>;

export default function TypedForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      title: '',
      content: '',
      tags: [],
      published: false,
    },
  });

  async function onSubmit(data: FormData) {
    // Formular verarbeiten
    console.log(data);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="title">Titel</label>
        <input
          id="title"
          {...register('title')}
          className="w-full px-3 py-2 border rounded"
        />
        {errors.title && (
          <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
        )}
      </div>
      
      <div>
        <label htmlFor="content">Inhalt</label>
        <textarea
          id="content"
          {...register('content')}
          rows={5}
          className="w-full px-3 py-2 border rounded"
        ></textarea>
        {errors.content && (
          <p className="text-red-500 text-sm mt-1">{errors.content.message}</p>
        )}
      </div>
      
      <button
        type="submit"
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Speichern
      </button>
    </form>
  );
}
```

---

Dieser Leitfaden bietet einen umfassenden Überblick über die Implementierung von Server Actions und URL-basierten States/Suchen in Next.js. Mit diesen Techniken können Sie robuste, typsichere und performante Anwendungen erstellen, die sowohl eine gute Benutzererfahrung als auch eine solide Entwicklerbasis bieten.