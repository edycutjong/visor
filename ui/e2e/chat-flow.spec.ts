import { test, expect } from '@playwright/test';

test.describe('Visor Core Submission Flow (E2E)', () => {
  test('should select template, fill form, submit securely, and view receipt', async ({ page }) => {
    // 1. Visit the home page
    await page.goto('/');

    // 2. Select the Clinical Intake Agent template
    const deployButton = page.locator('div').filter({ hasText: /^Clinical Intake Agent/ }).getByRole('button', { name: 'Deploy Submission' }).first();
    await deployButton.click();

    // 3. Verify that the Split Screen Egress Console is revealed
    await expect(page.getByText('Egress Console: clinic-intake')).toBeVisible();

    // 4. Fill in the non-secure payload (symptom)
    const symptomTextarea = page.locator('textarea[placeholder="Enter symptom..."]');
    await expect(symptomTextarea).toBeVisible();
    await symptomTextarea.fill('dermatological consult and skin checks');

    // 5. Submit securely
    const submitButton = page.getByRole('button', { name: 'SUBMIT SECURELY' });
    await submitButton.click();

    // 6. Verify transition states and final confirmation
    // In simulator mode, the flow takes ~3.6s to complete. Let's wait for the receipt button or confirmation text.
    await expect(page.getByText('VIEW VERIFIABLE RECEIPT VC')).toBeVisible({ timeout: 6000 });
    await expect(page.getByText('Appointment Confirmed')).toBeVisible();

    // 7. Click View Verifiable Receipt VC and verify modal
    const receiptButton = page.getByRole('button', { name: 'VIEW VERIFIABLE RECEIPT VC' });
    await receiptButton.click();

    // Verify modal is open and has correct issuer information
    await expect(page.getByText('VERIFIABLE EGRESS RECEIPT')).toBeVisible();
    await expect(page.getByText('did:t3n:visor-enclave-signer').first()).toBeVisible();

    // Close modal
    const closeButton = page.getByRole('button', { name: 'Close' });
    await closeButton.click();
    await expect(page.getByText('VERIFIABLE EGRESS RECEIPT')).not.toBeVisible();
  });
});
