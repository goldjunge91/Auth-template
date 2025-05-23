import { test, expect } from '@playwright/test';

test.describe('User Registration Flow', () => {
  const uniqueUserEmail = `testuser_${Date.now()}@example.com`;
  const testPassword = 'password123';

  test('should allow a user to register successfully', async ({ page }) => {
    await page.goto('/register');

    // Fill out the registration form
    await page.getByPlaceholder('Max Mustermann').fill('Test User');
    await page.getByPlaceholder('ihre.email@beispiel.de').fill(uniqueUserEmail);
    await page.getByLabel('Passwort', { exact: true }).fill(testPassword);
    await page.getByLabel('Passwort bestätigen').fill(testPassword);

    // Submit the form
    await page.getByRole('button', { name: 'Registrieren' }).click();

    // Wait for navigation to the homepage (or dashboard)
    await expect(page).toHaveURL('/'); 

    // Check for a welcome message or user profile element to confirm login
    // This depends on what your application shows after login.
    // For example, if there's a navbar with the user's name:
    // await expect(page.locator('nav')).toContainText('Test User');
    // Or if redirected to a profile page that has a specific heading:
    // await expect(page.getByRole('heading', { name: 'User Profile' })).toBeVisible();

    // For now, let's check if we can access the protected profile page
    await page.goto('/profile');
    await expect(page).toHaveURL('/profile'); 
    // Add a more specific check for content on the profile page if possible
    // For example: await expect(page.getByText(`Welcome, Test User`)).toBeVisible();
  });

  test('should show an error message for registration with an existing email', async ({ page }) => {
    // First, create a user to ensure the email exists
    await page.goto('/register');
    await page.getByPlaceholder('Max Mustermann').fill('Existing User');
    await page.getByPlaceholder('ihre.email@beispiel.de').fill(uniqueUserEmail); // Use the same email
    await page.getByLabel('Passwort', { exact: true }).fill(testPassword);
    await page.getByLabel('Passwort bestätigen').fill(testPassword);
    await page.getByRole('button', { name: 'Registrieren' }).click();
    await expect(page).toHaveURL('/'); // Wait for the first registration to complete

    // Logout or clear session if necessary - for this app, redirecting to /register effectively does this for the test
    // For a real app, you might need a dedicated logout flow:
    // await page.getByRole('button', { name: 'Logout' }).click();
    // await expect(page).toHaveURL('/login'); 

    // Attempt to register again with the same email
    await page.goto('/register');
    await page.getByPlaceholder('Max Mustermann').fill('Another User');
    await page.getByPlaceholder('ihre.email@beispiel.de').fill(uniqueUserEmail);
    await page.getByLabel('Passwort', { exact: true }).fill('anotherPassword');
    await page.getByLabel('Passwort bestätigen').fill('anotherPassword');
    await page.getByRole('button', { name: 'Registrieren' }).click();

    // Check for an error message
    // The login page uses sonner for toasts. Toast messages are harder to reliably test with Playwright out-of-the-box
    // without specific selectors for them or by listening to network responses.
    // For now, we'll assume the API prevents redirection or shows an error on the page.
    // A more robust check would be to look for the toast message itself.
    // Example for a toast: await expect(page.getByText('Ein Fehler ist aufgetreten.')).toBeVisible();
    // Or check that we are still on the registration page
    await expect(page).toHaveURL('/register'); 
    // And that a general error message is shown (if the application adds one to the DOM)
    // This is a placeholder, actual error message selector might differ:
    // await expect(page.locator('.error-message')).toContainText('E-Mail bereits registriert'); 
    // Since the register page uses toast.error(result.message || "Ein Fehler ist aufgetreten.")
    // we expect a toast. We will check for the toast message.
    await expect(page.getByText('Ein Fehler ist aufgetreten.')).toBeVisible();
  });

  test('should show an error message for mismatched passwords during registration', async ({ page }) => {
    await page.goto('/register');

    await page.getByPlaceholder('Max Mustermann').fill('Mismatch User');
    await page.getByPlaceholder('ihre.email@beispiel.de').fill(`mismatch_${Date.now()}@example.com`);
    await page.getByLabel('Passwort', { exact: true }).fill(testPassword);
    await page.getByLabel('Passwort bestätigen').fill('wrongPassword');
    await page.getByRole('button', { name: 'Registrieren' }).click();

    // Check for the specific error message for mismatched passwords
    await expect(page.getByText('Die Passwörter stimmen nicht überein.')).toBeVisible();
    await expect(page).toHaveURL('/register'); // Should remain on the register page
  });
});

test.describe('User Login Flow', () => {
  const loginTestUserEmail = `logintestuser_${Date.now()}@example.com`; 
  const loginTestPassword = 'password123Login';

  // Helper function to register a user for login tests
  async function registerUserForLogin(page: import('@playwright/test').Page) {
    await page.goto('/register');
    await page.getByPlaceholder('Max Mustermann').fill('Login Test User');
    await page.getByPlaceholder('ihre.email@beispiel.de').fill(loginTestUserEmail);
    await page.getByLabel('Passwort', { exact: true }).fill(loginTestPassword);
    await page.getByLabel('Passwort bestätigen').fill(loginTestPassword);
    await page.getByRole('button', { name: 'Registrieren' }).click();
    await expect(page).toHaveURL('/'); // Wait for registration and redirection
    // Optional: Add a logout step here if your app automatically logs in after registration
    // and you want to test login from a logged-out state explicitly.
    // For now, we assume redirecting to /login is sufficient.
  }

  test.beforeAll(async ({ browser }) => {
    // Create a new page context for registration to isolate it
    const page = await browser.newPage();
    await registerUserForLogin(page);
    await page.close();
  });

  test('should allow a registered user to log in successfully', async ({ page }) => {
    await page.goto('/login');

    // Fill out the login form
    await page.getByPlaceholder('ihre.email@beispiel.de').fill(loginTestUserEmail);
    await page.getByPlaceholder('••••••••').fill(loginTestPassword); // Placeholder for password
    await page.getByRole('button', { name: 'Anmelden' }).click();

    // Wait for navigation to the homepage or dashboard
    await expect(page).toHaveURL('/');

    // Verify authenticated state (e.g., by accessing a protected route)
    await page.goto('/profile');
    await expect(page).toHaveURL('/profile');
    // Add a more specific check for content on the profile page if possible
    // For example: await expect(page.getByText(`Welcome, Login Test User`)).toBeVisible();
  });

  test('should show an error message for login with incorrect credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill out the login form with incorrect password
    await page.getByPlaceholder('ihre.email@beispiel.de').fill(loginTestUserEmail);
    await page.getByPlaceholder('••••••••').fill('wrongPassword');
    await page.getByRole('button', { name: 'Anmelden' }).click();

    // Check for an error message (e.g., toast message)
    // The login page uses sonner for toasts: toast.error("Ungültige E-Mail oder Passwort.")
    await expect(page.getByText('Ungültige E-Mail oder Passwort.')).toBeVisible();
    
    // Verify that the user remains on the login page
    await expect(page).toHaveURL('/login');
  });

  test('should show an error message for login with a non-existent email', async ({ page }) => {
    await page.goto('/login');

    // Fill out the login form with a non-existent email
    await page.getByPlaceholder('ihre.email@beispiel.de').fill('nonexistent@example.com');
    await page.getByPlaceholder('••••••••').fill('anypassword');
    await page.getByRole('button', { name: 'Anmelden' }).click();

    // Check for an error message
    await expect(page.getByText('Ungültige E-Mail oder Passwort.')).toBeVisible();
    
    // Verify that the user remains on the login page
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Route Protection Flow', () => {
  const uniqueUserEmailForRouteProtection = `route_test_user_${Date.now()}@example.com`;
  const routeTestPassword = 'password123';

  test('should redirect to /login when accessing a protected route (/profile) while not authenticated', async ({ page }) => {
    await page.goto('/profile');
    // Check if the redirection to /login happens
    await expect(page).toHaveURL('/login');
    // Optionally, verify that some content from the login page is visible
    await expect(page.getByRole('heading', { name: 'Anmelden' })).toBeVisible();
  });

  test('should allow access to a protected route (/profile) when authenticated', async ({ page }) => {
    // First, register and log in the user
    // Register user
    await page.goto('/register');
    await page.getByPlaceholder('Max Mustermann').fill('Route Test User');
    await page.getByPlaceholder('ihre.email@beispiel.de').fill(uniqueUserEmailForRouteProtection);
    await page.getByLabel('Passwort', { exact: true }).fill(routeTestPassword);
    await page.getByLabel('Passwort bestätigen').fill(routeTestPassword);
    await page.getByRole('button', { name: 'Registrieren' }).click();
    await expect(page).toHaveURL('/'); // Wait for registration and redirection

    // At this point, the user is registered and logged in due to the application's flow.
    // Now, navigate to the protected route
    await page.goto('/profile');
    await expect(page).toHaveURL('/profile');

    // Verify that some content specific to the profile page is visible
    // This depends on what the /profile page actually shows.
    // For example, if it shows the user's email or a welcome message:
    // await expect(page.getByText(uniqueUserEmailForRouteProtection)).toBeVisible();
    // Or a generic heading that's only on the profile page:
    // await expect(page.getByRole('heading', { name: 'User Profile' })).toBeVisible(); // Assuming /profile has such a heading
                                                                                    // If not, this selector will need adjustment based on actual content.
                                                                                    // Based on `src/app/profile/page.tsx` a heading "User Profile" might not exist.
                                                                                    // Let's check for some text that might be there like "Your Profile" or the user's email.
                                                                                    // The `src/app/profile/page.tsx` shows "My Profile" and user details.
    await expect(page.getByRole('heading', { name: 'My Profile' })).toBeVisible();
    await expect(page.getByText(uniqueUserEmailForRouteProtection)).toBeVisible();                                                                                
  });
});
