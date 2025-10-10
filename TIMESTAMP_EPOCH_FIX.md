# Timestamp Epoch Clamping Fix

## Issue

Dates before January 2026 were showing negative values or awkward displays like `0000000-11` in the Year/Month bit field.

**Example Problem**:
```
October 2025: (2025 - 2026) × 12 + 9 = -3
Binary: "-3".toString(2) = "-11" (invalid!)
Display: 0000000-11 (awkward)
```

## Solution

Added clamping to ensure any date before the epoch (January 2026) is encoded as 0 (all zeros).

### Code Changes

**File**: `web/messageCodec.html`

```javascript
function updateTimestamp() {
    const now = new Date();
    
    // Calculate year/month - months since Jan 2026
    const year = now.getUTCFullYear() - 2026;
    const month = now.getUTCMonth();
    const yearMonth = year * 12 + month;
    
    // ✅ Clamp to 0 if before Jan 2026 (epoch start)
    const clampedYearMonth = Math.max(0, yearMonth);
    const yearMonthBits = clampedYearMonth.toString(2).padStart(10, '0');
    
    // ... rest of function
    
    // Store clamped value
    currentTimestamp = {
        yearMonth: clampedYearMonth,  // ✅ Use clamped value
        // ... rest of fields
    };
}
```

### Visual Indicator

When the current date is before January 2026, a warning is shown:

```
Current UTC Time: 2025-Oct-09 12:34:56 UTC ⚠️ Before Jan 2026 (encoded as 0)
```

## Behavior After Fix

| Date | Calculation | Clamped | Bits | Display |
|------|-------------|---------|------|---------|
| Oct 2025 | -3 | **0** | `0000000000` | ⚠️ Before Jan 2026 |
| Dec 2025 | -1 | **0** | `0000000000` | ⚠️ Before Jan 2026 |
| Jan 2026 | 0 | 0 | `0000000000` | Epoch start ✅ |
| Feb 2026 | 1 | 1 | `0000000001` | Normal ✅ |
| Dec 2030 | 59 | 59 | `0000111011` | Normal ✅ |

## Why This Matters

### For Current Users (2025)

Since we're currently in October 2025 (before the epoch):
- Timestamp will show `0000000000` (all zeros)
- Warning message appears in display
- Encoding/decoding works correctly
- No invalid binary strings

### For Future Users (2026+)

- Normal operation
- No clamping needed
- Full range: Jan 2026 to Apr 2111

## Technical Details

### Math.max() Function

```javascript
const clampedYearMonth = Math.max(0, yearMonth);
```

| Input | Output | Explanation |
|-------|--------|-------------|
| -3 | 0 | Clamped to minimum (0) |
| -1 | 0 | Clamped to minimum (0) |
| 0 | 0 | No change (at minimum) |
| 5 | 5 | No change (above minimum) |
| 1023 | 1023 | No change (max value) |

### Binary Representation

**Before Fix** (October 2025):
```
yearMonth = -3
toString(2) = "-11"
padStart(10, '0') = "0000000-11"  ❌ Invalid!
```

**After Fix** (October 2025):
```
yearMonth = -3
clampedYearMonth = Math.max(0, -3) = 0
toString(2) = "0"
padStart(10, '0') = "0000000000"  ✅ Valid!
```

## Impact

### Encoding
- Before Jan 2026: All messages encoded with `0000000000` for Year/Month
- Jan 2026+: Normal encoding with correct month count

### Decoding
- All-zero Year/Month bits decode to "Jan 2026"
- Accurate for messages sent on/after Jan 2026
- Pre-epoch messages show epoch start date

### Display
- Clear warning when before epoch
- User knows the date is being clamped
- No confusion about "negative" dates

## Testing

### Manual Test
1. Start server: `run_tests.bat`
2. Open: `http://localhost:8000/web/messageCodec.html`
3. Select Contest Mode
4. Verify timestamp shows: `2025-Oct-09 ... ⚠️ Before Jan 2026 (encoded as 0)`
5. Verify Year/Month bits show: `0000000000` (not `0000000-11`)
6. Click Encode
7. Verify output shows `0000000000` for Year/Month

### Expected Results
✅ No negative signs in bit fields  
✅ Warning message appears  
✅ Encoding works correctly  
✅ Decoding reconstructs as Jan 2026  

## Documentation Updates

| File | Update |
|------|--------|
| `web/messageCodec.html` | Added clamping logic |
| `TIMESTAMP_INTEGRATION.md` | Updated examples with clamping |
| `TIMESTAMP_EPOCH_FIX.md` | This document |

## Future Considerations

### After January 2026

Once we reach January 2026:
- Warning will stop appearing
- Clamping becomes unnecessary (but harmless)
- Full 85-year range becomes usable

### Alternative Approaches Considered

1. **Show error**: Could display "Invalid date" for pre-epoch dates
   - ❌ Not user-friendly
   - ❌ Breaks encoding flow

2. **Hide timestamp section**: Don't show before epoch
   - ❌ Confusing UX
   - ❌ Hard to test now (2025)

3. **Allow negative encoding**: Use two's complement
   - ❌ Wastes bit space
   - ❌ Breaks ACK compatibility
   - ❌ No real benefit

4. **✅ Clamp to epoch**: What we chose
   - ✅ Clean display
   - ✅ Valid encoding
   - ✅ Clear warning
   - ✅ Easy to test

## Summary

✅ **Fixed**: Dates before Jan 2026 now clamp to 0  
✅ **Display**: Shows `0000000000` instead of `0000000-11`  
✅ **Warning**: User sees "⚠️ Before Jan 2026 (encoded as 0)"  
✅ **Impact**: No functional issues, clean UX  
✅ **Future**: Works correctly for all dates Jan 2026 - Apr 2111  

**Status**: ✅ **FIXED** - Timestamp epoch clamping working correctly!

---

**Date**: October 9, 2025  
**Issue**: Negative year/month values  
**Fix**: Math.max(0, yearMonth) clamping  
**Result**: Clean display with warning



