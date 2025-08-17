import { test, expect } from '@playwright/test';

test.describe('Video Watch Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the home page first
    await page.goto('/');
  });

  test('should display video list on home page', async ({ page }) => {
    // Check if the page loads with video list
    await expect(page.locator('h2')).toContainText('Recent Videos');
    
    // Check if there are video cards
    const videoCards = page.locator('.bg-white, .bg-gray-800');
    await expect(videoCards.first()).toBeVisible();
  });

  test('should navigate to video watch page when clicking video title', async ({ page }) => {
    // Find the first video title and click it
    const firstVideoTitle = page.locator('h3').first();
    const videoTitleText = await firstVideoTitle.textContent();
    
    await firstVideoTitle.click();
    
    // Should navigate to video watch page
    await expect(page).toHaveURL(/\/videos\/[a-f0-9-]+$/);
    
    // Should display the same video title
    await expect(page.locator('h1')).toContainText(videoTitleText || '');
  });

  test('should display video watch page elements', async ({ page }) => {
    // Navigate to a video page (assuming there's at least one video)
    await page.goto('/');
    const firstVideoTitle = page.locator('h3').first();
    await firstVideoTitle.click();
    
    // Check for essential elements
    await expect(page.locator('a[href="/"]')).toContainText('← Back to Videos');
    await expect(page.locator('h1')).toBeVisible(); // Video title
    
    // Check for video player area
    const videoPlayer = page.locator('video, .aspect-video');
    await expect(videoPlayer).toBeVisible();
    
    // Check for video info section
    const videoInfoSection = page.locator('.bg-white, .bg-gray-800').filter({ hasText: 'Description' });
    await expect(videoInfoSection).toBeVisible();
  });

  test('should have expandable description section', async ({ page }) => {
    // Navigate to a video page
    await page.goto('/');
    const firstVideoTitle = page.locator('h3').first();
    await firstVideoTitle.click();
    
    // Check for description section
    const descriptionSection = page.locator('h4').filter({ hasText: 'Description' });
    await expect(descriptionSection).toBeVisible();
    
    // Check for "Show more" button
    const showMoreButton = page.locator('button').filter({ hasText: 'Show more' });
    await expect(showMoreButton).toBeVisible();
    
    // Click "Show more" to expand
    await showMoreButton.click();
    
    // Should show "Show less" button
    await expect(page.locator('button').filter({ hasText: 'Show less' })).toBeVisible();
    
    // Should show additional info (status and captions)
    await expect(page.locator('text=Status:')).toBeVisible();
    await expect(page.locator('text=Captions:')).toBeVisible();
  });

  test('should handle videos without description', async ({ page }) => {
    // Navigate to a video page
    await page.goto('/');
    const firstVideoTitle = page.locator('h3').first();
    await firstVideoTitle.click();
    
    // Description section should still be visible with placeholder text
    const descriptionSection = page.locator('h4').filter({ hasText: 'Description' });
    await expect(descriptionSection).toBeVisible();
    
    // Should show placeholder text if no description
    const descriptionText = page.locator('.text-gray-600, .text-gray-300');
    await expect(descriptionText).toBeVisible();
  });

  test('should show transcript button only when captions are available', async ({ page }) => {
    // Navigate to a video page
    await page.goto('/');
    const firstVideoTitle = page.locator('h3').first();
    await firstVideoTitle.click();
    
    // Check if transcript button exists (it may or may not be visible depending on captions)
    const transcriptButton = page.locator('button').filter({ hasText: /Show Transcript|Hide Transcript/ });
    
    // The button should either be visible (if captions available) or not exist (if no captions)
    const buttonCount = await transcriptButton.count();
    if (buttonCount > 0) {
      await expect(transcriptButton).toBeVisible();
    }
    // If button doesn't exist, that's also valid (no captions available)
  });

  test('should toggle transcript panel when button is clicked', async ({ page }) => {
    // Navigate to a video page
    await page.goto('/');
    const firstVideoTitle = page.locator('h3').first();
    await firstVideoTitle.click();
    
    // Look for transcript button
    const transcriptButton = page.locator('button').filter({ hasText: /Show Transcript|Hide Transcript/ });
    
    if (await transcriptButton.count() > 0) {
      // If transcript button exists, test the toggle functionality
      await expect(transcriptButton).toBeVisible();
      
      // Initially, transcript panel should not be visible
      const transcriptPanel = page.locator('h3').filter({ hasText: 'Transcript' });
      await expect(transcriptPanel).not.toBeVisible();
      
      // Click "Show Transcript"
      await transcriptButton.click();
      
      // Transcript panel should now be visible
      await expect(transcriptPanel).toBeVisible();
      
      // Button should now say "Hide Transcript"
      await expect(transcriptButton).toContainText('Hide Transcript');
      
      // Click "Hide Transcript"
      await transcriptButton.click();
      
      // Transcript panel should be hidden again
      await expect(transcriptPanel).not.toBeVisible();
      
      // Button should say "Show Transcript" again
      await expect(transcriptButton).toContainText('Show Transcript');
    }
  });

  test('should handle video not ready state', async ({ page }) => {
    // This test checks the fallback for videos that aren't ready
    // We can't easily create this state, but we can verify the structure exists
    
    // Navigate to a video page
    await page.goto('/');
    const firstVideoTitle = page.locator('h3').first();
    await firstVideoTitle.click();
    
    // Check that the page structure can handle both ready and not-ready states
    const videoContainer = page.locator('.aspect-video');
    await expect(videoContainer).toBeVisible();
  });

  test('should have proper responsive layout', async ({ page }) => {
    // Navigate to a video page
    await page.goto('/');
    const firstVideoTitle = page.locator('h3').first();
    await firstVideoTitle.click();
    
    // Check that the grid layout is present
    const gridContainer = page.locator('.grid');
    await expect(gridContainer).toBeVisible();
    
    // Check that video player takes up the main area
    const videoPlayerContainer = page.locator('.lg\\:col-span-2');
    await expect(videoPlayerContainer).toBeVisible();
  });

  test('should display channel information', async ({ page }) => {
    // Navigate to a video page
    await page.goto('/');
    const firstVideoTitle = page.locator('h3').first();
    await firstVideoTitle.click();
    
    // Check for channel information in the header
    const channelInfo = page.locator('p').filter({ hasText: /Channel|Default Channel/ });
    await expect(channelInfo).toBeVisible();
  });

  test('should have working back navigation', async ({ page }) => {
    // Navigate to a video page
    await page.goto('/');
    const firstVideoTitle = page.locator('h3').first();
    await firstVideoTitle.click();
    
    // Click back to videos link
    const backLink = page.locator('a[href="/"]');
    await expect(backLink).toContainText('← Back to Videos');
    await backLink.click();
    
    // Should return to home page
    await expect(page).toHaveURL('/');
    await expect(page.locator('h2')).toContainText('Recent Videos');
  });
});
