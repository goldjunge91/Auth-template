import { NextResponse } from 'next/server';
import bcryptjs from 'bcryptjs';
import { db } from '@/db'; // Importiere schema und eq von @/db
import { eq } from 'drizzle-orm';
import * as schema from '@/db/schema/sqlite/index.sql'; // Importiere das Schema
export async function POST(request: Request) {
  try {
    // Debuggen der eingehenden Anfrage
    console.log('Request Headers:', Object.fromEntries(request.headers.entries()));
    console.log('Request Method:', request.method);

    // Clone the request to read the body (since it can only be read once)
    const requestClone = request.clone();
    const rawBody = await requestClone.text();
    console.log('Raw Request Body:', rawBody);

    // Überprüfen, ob der Request-Body Daten enthält
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { message: 'Content-Type muss application/json sein.' },
        { status: 400 }
      );
    }

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (error) {
      console.error('JSON-Parsing-Fehler:', error);
      return NextResponse.json(
        { message: 'Ungültiges JSON-Format in der Anfrage.' },
        { status: 400 }
      );
    }

    const { name, email, password } = body || {};

    if (!name || !email || !password) {
      return NextResponse.json(
        { message: 'Name, E-Mail und Passwort sind erforderlich.' },
        { status: 400 }
      );
    }

    // Passwort hashen
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Prüfen, ob die E-Mail bereits existiert
    const existingUsers = await db.select().from(schema.users)
      .where(eq(schema.users.email, email));

    if (existingUsers && existingUsers.length > 0) {
      return NextResponse.json(
        { message: 'Ein Benutzer mit dieser E-Mail existiert bereits.' },
        { status: 400 }
      );
    }

    // Benutzer erstellen
    const result = await db.insert(schema.users).values({
      name,
      email,
      passwordHash: hashedPassword,
      role: 'user', // Standardrolle 'user' bei der Registrierung setzen
    }).returning();

    if (!result || result.length === 0) {
      throw new Error('Benutzer konnte nicht erstellt werden');
    }

    return NextResponse.json({
      message: 'Benutzer erfolgreich registriert.',
      userId: result[0].id
    }, { status: 201 });

  } catch (error: any) {
    console.error('Fehler bei der Registrierung:', error);

    return NextResponse.json(
      { message: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.' },
      { status: 500 }
    );
  }
}
