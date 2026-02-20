# Testing Guide

## Current Status

The application foundation is complete and ready for testing. Here's what should work:

## ✅ Features Ready to Test

### 1. Host Input
- **Add hosts**: Enter comma-separated hosts (e.g., `api1.com, https://api2.com`)
- **Reference selection**: Click the star icon (☆) next to a host to set it as reference
- **Edit hosts**: Click on a host value to edit it inline
- **Remove hosts**: Click the × button to remove a host
- **Validation**: Invalid host formats show error messages

### 2. cURL Input
- **Textarea mode**: Enter cURL commands (one per line)
- **File upload**: Upload a text file with cURL commands
- **{host} placeholder**: Commands should include `{host}` placeholder
- **Auto-detection**: If `{host}` is missing, a warning modal appears
- **Command list**: Added commands appear below with remove option

### 3. Auto-Detection Warning
- When a cURL command lacks `{host}` placeholder:
  - Warning modal appears
  - Shows original command
  - Shows auto-detected version
  - Options: Accept & Add or Cancel

## 🚧 Not Yet Implemented

- Execute button and comparison execution
- Comparison tabs
- Diff viewer
- Comparison options/settings

## Testing Steps

1. **Start the dev server**:
   ```bash
   npm install  # First time only
   npm run dev
   ```

2. **Test Host Input**:
   - Add hosts: `api1.com, https://api2.com, api3.com`
   - Click star icon on second host to make it reference
   - Edit a host value
   - Remove a host

3. **Test cURL Input**:
   - Switch to textarea mode
   - Enter: `curl https://{host}/api/users`
   - Click "Add cURL Commands"
   - Try without {host}: `curl https://api.example.com/users`
   - Should show warning modal

4. **Test File Upload**:
   - Switch to file upload mode
   - Create a text file with cURL commands (one per line)
   - Upload the file

## Expected Behavior

- Hosts should display with reference indicator (⭐ for reference, ☆ for others)
- cURL commands should be validated
- Warning modal should appear for missing {host}
- No console errors
- UI should be responsive

## Known Issues / Next Steps

- Execute functionality not yet wired up
- Comparison results not displayed yet
- Need to add comparison tabs component
- Need to add diff viewer component

---

**Status**: Foundation complete, ready for UI testing
