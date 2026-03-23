import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Security: Maximum records per import to prevent DoS
const MAX_RECORDS_PER_IMPORT = 1000;

// Security: Maximum field lengths to prevent database overflow
const MAX_FIELD_LENGTHS = {
  name: 200,
  first_name: 100,
  last_name: 100,
  email: 255,
  phone: 50,
  address: 500,
  notes: 5000,
  location: 500,
  tags: 500,
  loyalty_programs: 1000,
  trip_name: 300,
  destination: 300,
  booking_reference: 100,
  owner_agent: 200,
  url: 2048,
};

interface ClientRecord {
  // New CSV fields
  "First Name"?: string;
  "Preferred First Name"?: string;
  "Last Name"?: string;
  "Primary Email"?: string;
  "Primary Phone Number"?: string;
  "Birthday"?: string;
  "Address Line 1"?: string;
  "Address Line 2"?: string;
  "Address Country"?: string;
  "Address City"?: string;
  "Address State"?: string;
  "Address Zip Code"?: string;
  "Loyalty Programs"?: string;
  "Tags"?: string;
  // Legacy fields for backward compatibility
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  status?: string;
  notes?: string;
}

interface BookingRecord {
  // New trips CSV format
  "Trip Name"?: string;
  "Trip Page"?: string;
  "Status"?: string;
  "Start Date"?: string;
  "End Date"?: string;
  "Primary Contact"?: string;
  "Owner Agent"?: string;
  "Gross Sale Amount (Your Currency)"?: string;
  // Legacy fields for backward compatibility
  client_name?: string;
  client_id?: string;
  booking_reference?: string;
  destination?: string;
  depart_date?: string;
  return_date?: string;
  travelers?: number;
  total_amount?: number;
  status?: string;
  notes?: string;
}

// Security: Validate email format
function isValidEmail(email: string): boolean {
  if (!email) return true; // Empty is valid (optional field)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= MAX_FIELD_LENGTHS.email;
}

// Security: Sanitize text to prevent CSV formula injection
// Prefixes =, +, -, @, tab, carriage return can trigger formula execution in Excel
function sanitizeForCSV(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  
  // Check if value starts with dangerous characters
  if (/^[=+\-@\t\r]/.test(trimmed)) {
    // Prefix with single quote to prevent formula execution
    return "'" + trimmed;
  }
  return trimmed;
}

// Security: Truncate string to max length
function truncateField(value: string | null | undefined, maxLength: number): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > maxLength ? trimmed.substring(0, maxLength) : trimmed;
}

// Security: Sanitize and truncate text field
function sanitizeAndTruncate(value: string | null | undefined, maxLength: number): string | null {
  const sanitized = sanitizeForCSV(value);
  return truncateField(sanitized, maxLength);
}

// Security: Validate date format (YYYY-MM-DD or common formats)
function isValidDate(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const trimmed = dateStr.trim();
  // Accept ISO format, US format, or common variations
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
    /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
  ];
  return datePatterns.some(pattern => pattern.test(trimmed));
}

// Security: Parse and normalize date to ISO format
function normalizeDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  
  // Already ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  
  // Try to parse other formats
  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
  
  return null;
}

// Security: Validate phone number format (basic validation)
function isValidPhone(phone: string | null | undefined): boolean {
  if (!phone) return true; // Empty is valid (optional field)
  const trimmed = phone.trim();
  // Allow digits, spaces, dashes, parentheses, plus sign
  const phoneRegex = /^[\d\s\-+().]+$/;
  return phoneRegex.test(trimmed) && trimmed.length <= MAX_FIELD_LENGTHS.phone;
}

interface ValidationError {
  field: string;
  message: string;
}

// Validate client record
function validateClientRecord(record: ClientRecord): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Check email format
  const email = record["Primary Email"]?.trim() || record.email?.trim();
  if (email && !isValidEmail(email)) {
    errors.push({ field: "email", message: `Invalid email format or exceeds ${MAX_FIELD_LENGTHS.email} characters` });
  }
  
  // Check phone format
  const phone = record["Primary Phone Number"]?.trim() || record.phone?.trim();
  if (phone && !isValidPhone(phone)) {
    errors.push({ field: "phone", message: "Invalid phone format" });
  }
  
  // Check field lengths
  const firstName = record["First Name"]?.trim();
  if (firstName && firstName.length > MAX_FIELD_LENGTHS.first_name) {
    errors.push({ field: "first_name", message: `First name exceeds ${MAX_FIELD_LENGTHS.first_name} characters` });
  }
  
  const lastName = record["Last Name"]?.trim();
  if (lastName && lastName.length > MAX_FIELD_LENGTHS.last_name) {
    errors.push({ field: "last_name", message: `Last name exceeds ${MAX_FIELD_LENGTHS.last_name} characters` });
  }
  
  const notes = record.notes?.trim();
  if (notes && notes.length > MAX_FIELD_LENGTHS.notes) {
    errors.push({ field: "notes", message: `Notes exceeds ${MAX_FIELD_LENGTHS.notes} characters` });
  }
  
  return errors;
}

// Validate booking record
function validateBookingRecord(record: BookingRecord): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Check date formats
  const startDate = record["Start Date"] || record.depart_date;
  if (startDate && !isValidDate(startDate)) {
    errors.push({ field: "start_date", message: "Invalid start date format" });
  }
  
  const endDate = record["End Date"] || record.return_date;
  if (endDate && !isValidDate(endDate)) {
    errors.push({ field: "end_date", message: "Invalid end date format" });
  }
  
  // Check field lengths
  const tripName = record["Trip Name"]?.trim();
  if (tripName && tripName.length > MAX_FIELD_LENGTHS.trip_name) {
    errors.push({ field: "trip_name", message: `Trip name exceeds ${MAX_FIELD_LENGTHS.trip_name} characters` });
  }
  
  const destination = record.destination?.trim();
  if (destination && destination.length > MAX_FIELD_LENGTHS.destination) {
    errors.push({ field: "destination", message: `Destination exceeds ${MAX_FIELD_LENGTHS.destination} characters` });
  }
  
  const notes = record.notes?.trim();
  if (notes && notes.length > MAX_FIELD_LENGTHS.notes) {
    errors.push({ field: "notes", message: `Notes exceeds ${MAX_FIELD_LENGTHS.notes} characters` });
  }
  
  return errors;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create user client to verify auth
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the authenticated user
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("User authenticated:", user.id);

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError) {
      console.error("Role check error:", roleError);
      return new Response(
        JSON.stringify({ error: "Failed to verify admin status" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!roleData) {
      console.error("User is not admin:", user.id);
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Admin verified");

    // Parse request body
    const body = await req.json();
    const { type, data, targetUserId, fileName } = body as {
      type: "clients" | "bookings";
      data: ClientRecord[] | BookingRecord[];
      targetUserId: string;
      fileName?: string;
    };

    if (!type || !data || !Array.isArray(data) || !targetUserId) {
      return new Response(
        JSON.stringify({ error: "Invalid request: type, data array, and targetUserId required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Security: Enforce batch size limit to prevent DoS
    if (data.length > MAX_RECORDS_PER_IMPORT) {
      console.error(`Batch size ${data.length} exceeds limit of ${MAX_RECORDS_PER_IMPORT}`);
      return new Response(
        JSON.stringify({ 
          error: `Maximum ${MAX_RECORDS_PER_IMPORT} records per import. Please split your file into smaller batches.` 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Importing ${data.length} ${type} records for user ${targetUserId}`);

    // Create import log
    const { data: logData, error: logError } = await supabase
      .from("import_logs")
      .insert({
        user_id: user.id,
        import_type: type,
        file_name: truncateField(fileName, 255),
        status: "processing",
      })
      .select()
      .single();

    if (logError) {
      console.error("Failed to create import log:", logError);
    }

    const logId = logData?.id;
    let recordsImported = 0;
    let recordsFailed = 0;
    const errors: { index: number; error: string; record: unknown }[] = [];

    if (type === "clients") {
      const clientData = data as ClientRecord[];

      for (let i = 0; i < clientData.length; i++) {
        const record = clientData[i];

        // Security: Validate record before processing
        const validationErrors = validateClientRecord(record);
        if (validationErrors.length > 0) {
          const errorMsg = validationErrors.map(e => `${e.field}: ${e.message}`).join("; ");
          errors.push({ index: i, error: `Validation failed - ${errorMsg}`, record });
          recordsFailed++;
          continue;
        }

        // Support both new CSV format and legacy format
        const firstName = sanitizeAndTruncate(record["First Name"], MAX_FIELD_LENGTHS.first_name) || "";
        const lastName = sanitizeAndTruncate(record["Last Name"], MAX_FIELD_LENGTHS.last_name) || "";
        const legacyName = sanitizeAndTruncate(record.name, MAX_FIELD_LENGTHS.name) || "";
        
        // Build name from first/last or use legacy name field
        const fullName = firstName || lastName 
          ? truncateField(`${firstName} ${lastName}`.trim(), MAX_FIELD_LENGTHS.name)
          : legacyName;

        if (!fullName) {
          errors.push({ index: i, error: "Name is required (First Name + Last Name or name field)", record });
          recordsFailed++;
          continue;
        }

        // Build location from address fields or use legacy location
        const addressParts = [
          sanitizeAndTruncate(record["Address Line 1"], MAX_FIELD_LENGTHS.address),
          sanitizeAndTruncate(record["Address Line 2"], MAX_FIELD_LENGTHS.address),
          sanitizeAndTruncate(record["Address City"], 100),
          sanitizeAndTruncate(record["Address State"], 100),
          sanitizeAndTruncate(record["Address Zip Code"], 20),
          sanitizeAndTruncate(record["Address Country"], 100),
        ].filter(Boolean);
        const location = addressParts.length > 0 
          ? truncateField(addressParts.join(", "), MAX_FIELD_LENGTHS.location)
          : sanitizeAndTruncate(record.location, MAX_FIELD_LENGTHS.location);

        const clientInsert = {
          user_id: targetUserId,
          name: fullName,
          first_name: sanitizeAndTruncate(record["First Name"], MAX_FIELD_LENGTHS.first_name),
          preferred_first_name: sanitizeAndTruncate(record["Preferred First Name"], MAX_FIELD_LENGTHS.first_name),
          last_name: sanitizeAndTruncate(record["Last Name"], MAX_FIELD_LENGTHS.last_name),
          email: truncateField(record["Primary Email"]?.trim() || record.email?.trim(), MAX_FIELD_LENGTHS.email),
          phone: sanitizeAndTruncate(record["Primary Phone Number"] || record.phone, MAX_FIELD_LENGTHS.phone),
          birthday: normalizeDate(record["Birthday"]),
          address_line_1: sanitizeAndTruncate(record["Address Line 1"], MAX_FIELD_LENGTHS.address),
          address_line_2: sanitizeAndTruncate(record["Address Line 2"], MAX_FIELD_LENGTHS.address),
          address_country: sanitizeAndTruncate(record["Address Country"], 100),
          address_city: sanitizeAndTruncate(record["Address City"], 100),
          address_state: sanitizeAndTruncate(record["Address State"], 100),
          address_zip_code: sanitizeAndTruncate(record["Address Zip Code"], 20),
          loyalty_programs: sanitizeAndTruncate(record["Loyalty Programs"], MAX_FIELD_LENGTHS.loyalty_programs),
          tags: sanitizeAndTruncate(record["Tags"], MAX_FIELD_LENGTHS.tags),
          location: location,
          status: ["active", "lead", "inactive"].includes(record.status || "")
            ? record.status
            : "lead",
          notes: sanitizeAndTruncate(record.notes, MAX_FIELD_LENGTHS.notes),
        };

        const { error: insertError } = await supabase.from("clients").insert(clientInsert);

        if (insertError) {
          console.error(`Failed to insert client at index ${i}:`, insertError);
          errors.push({ index: i, error: insertError.message, record });
          recordsFailed++;
        } else {
          recordsImported++;
        }
      }
    } else if (type === "bookings") {
      const bookingData = data as BookingRecord[];

      // First, get all clients for the target user to match by name
      const { data: existingClients } = await supabase
        .from("clients")
        .select("id, name, first_name, last_name")
        .eq("user_id", targetUserId);

      // Create multiple lookup maps for flexible matching
      const clientMap = new Map<string, string>();
      const clientFirstLastMap = new Map<string, string>();
      
      for (const c of existingClients || []) {
        // Normalize name by removing extra spaces and lowercasing
        const normalizedName = c.name.toLowerCase().replace(/\s+/g, " ").trim();
        clientMap.set(normalizedName, c.id);
        
        // Also create lookup by first_name + last_name
        if (c.first_name && c.last_name) {
          const firstLast = `${c.first_name} ${c.last_name}`.toLowerCase().replace(/\s+/g, " ").trim();
          clientFirstLastMap.set(firstLast, c.id);
        }
      }

      for (let i = 0; i < bookingData.length; i++) {
        const record = bookingData[i];

        // Security: Validate record before processing
        const validationErrors = validateBookingRecord(record);
        if (validationErrors.length > 0) {
          const errorMsg = validationErrors.map(e => `${e.field}: ${e.message}`).join("; ");
          errors.push({ index: i, error: `Validation failed - ${errorMsg}`, record });
          recordsFailed++;
          continue;
        }

        // Check if this is the new trips CSV format
        const isTripsFormat = record["Trip Name"] !== undefined;

        let tripName: string | null = null;
        let tripPageUrl: string | null = null;
        let departDate: string | null = null;
        let returnDate: string | null = null;
        let clientName: string | null = null;
        let ownerAgent: string | null = null;
        let totalAmount: number = 0;
        let status: string = "pending";
        let bookingReference: string | null = null;
        let destination: string | null = null;

        if (isTripsFormat) {
          tripName = sanitizeAndTruncate(record["Trip Name"], MAX_FIELD_LENGTHS.trip_name);
          
          // Extract URL from Trip Page field (format: {caption}view{/caption}https://...)
          const tripPageRaw = record["Trip Page"] || "";
          const urlMatch = tripPageRaw.match(/https?:\/\/[^\s"]+/);
          tripPageUrl = urlMatch ? truncateField(urlMatch[0], MAX_FIELD_LENGTHS.url) : null;
          
          // Extract trip ID from URL for booking reference
          const tripIdMatch = tripPageUrl?.match(/\/trips\/(\d+)/);
          bookingReference = tripIdMatch 
            ? truncateField(`TRIP-${tripIdMatch[1]}`, MAX_FIELD_LENGTHS.booking_reference)
            : truncateField(`TRIP-${Date.now()}-${i}`, MAX_FIELD_LENGTHS.booking_reference);
          
          // Use trip name as destination
          destination = tripName || "Unknown";
          
          departDate = normalizeDate(record["Start Date"]);
          returnDate = normalizeDate(record["End Date"]);
          
          // Parse primary contact - skip records with '--' as contact
          const primaryContact = record["Primary Contact"]?.trim() || "";
          if (primaryContact === "'--" || primaryContact === "--" || !primaryContact) {
            // Skip group/inbound trips without a specific client
            console.log(`Skipping trip "${tripName}" - no primary contact assigned`);
            continue;
          }
          clientName = sanitizeAndTruncate(primaryContact, MAX_FIELD_LENGTHS.name);
          
          ownerAgent = sanitizeAndTruncate(record["Owner Agent"], MAX_FIELD_LENGTHS.owner_agent);
          
          // Parse amount - sanitize to prevent injection
          const amountStr = record["Gross Sale Amount (Your Currency)"] || "0";
          const cleanAmount = amountStr.replace(/[^0-9.-]/g, "");
          totalAmount = parseFloat(cleanAmount) || 0;
          // Security: Cap amount to reasonable maximum
          if (totalAmount > 10000000) {
            totalAmount = 10000000;
          }
          if (totalAmount < 0) {
            totalAmount = 0;
          }
          
          // Map status: Booked -> confirmed, Planning -> pending, Inbound -> pending, Archived -> completed
          const tripStatus = record["Status"]?.trim().toLowerCase() || "";
          if (tripStatus === "booked") {
            status = "confirmed";
          } else if (tripStatus === "planning" || tripStatus === "inbound") {
            status = "pending";
          } else if (tripStatus === "archived") {
            status = "completed";
          } else {
            status = "pending";
          }
        } else {
          // Legacy format
          bookingReference = sanitizeAndTruncate(record.booking_reference, MAX_FIELD_LENGTHS.booking_reference);
          destination = sanitizeAndTruncate(record.destination, MAX_FIELD_LENGTHS.destination);
          departDate = normalizeDate(record.depart_date);
          returnDate = normalizeDate(record.return_date);
          clientName = sanitizeAndTruncate(record.client_name, MAX_FIELD_LENGTHS.name);
          totalAmount = Math.min(Math.max(record.total_amount || 0, 0), 10000000);
          status = ["confirmed", "pending", "cancelled", "completed"].includes(record.status || "")
            ? record.status!
            : "pending";
        }

        // Validate required fields
        if (!departDate || !returnDate) {
          errors.push({
            index: i,
            error: "Start date and end date are required and must be valid dates",
            record,
          });
          recordsFailed++;
          continue;
        }

        // Resolve client_id with fuzzy name matching
        let clientId = record.client_id;
        if (!clientId && clientName) {
          // Normalize the client name from CSV
          const normalizedClientName = clientName.toLowerCase().replace(/\s+/g, " ").trim();
          
          // Try exact match first
          clientId = clientMap.get(normalizedClientName);
          
          // Try first_name + last_name lookup
          if (!clientId) {
            clientId = clientFirstLastMap.get(normalizedClientName);
          }
          
          // Try partial matching (first name only or last name only)
          if (!clientId) {
            const nameParts = normalizedClientName.split(" ");
            for (const [key, id] of clientMap.entries()) {
              // Check if all parts of the search name are in the client name
              const allPartsMatch = nameParts.every(part => key.includes(part));
              if (allPartsMatch) {
                clientId = id;
                break;
              }
            }
          }
          
          if (!clientId) {
            errors.push({
              index: i,
              error: `Client "${clientName}" not found. Import clients first.`,
              record,
            });
            recordsFailed++;
            continue;
          }
        }

        if (!clientId) {
          errors.push({ index: i, error: "client_id or Primary Contact is required", record });
          recordsFailed++;
          continue;
        }

        const bookingInsert = {
          user_id: targetUserId,
          client_id: clientId,
          booking_reference: bookingReference || truncateField(`BK-${Date.now()}-${i}`, MAX_FIELD_LENGTHS.booking_reference),
          destination: destination || "Unknown",
          depart_date: departDate,
          return_date: returnDate,
          travelers: Math.min(Math.max(record.travelers || 1, 1), 100), // Cap travelers 1-100
          total_amount: totalAmount,
          status: status,
          notes: sanitizeAndTruncate(record.notes, MAX_FIELD_LENGTHS.notes),
          trip_name: tripName,
          trip_page_url: tripPageUrl,
          owner_agent: ownerAgent,
        };

        const { error: insertError } = await supabase.from("bookings").insert(bookingInsert);

        if (insertError) {
          console.error(`Failed to insert booking at index ${i}:`, insertError);
          errors.push({ index: i, error: insertError.message, record });
          recordsFailed++;
        } else {
          recordsImported++;
        }
      }
    }

    // Update import log
    if (logId) {
      await supabase
        .from("import_logs")
        .update({
          records_imported: recordsImported,
          records_failed: recordsFailed,
          status: recordsFailed === 0 ? "completed" : "completed_with_errors",
          error_details: errors.length > 0 ? errors : null,
          completed_at: new Date().toISOString(),
        })
        .eq("id", logId);
    }

    console.log(`Import complete: ${recordsImported} imported, ${recordsFailed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        recordsImported,
        recordsFailed,
        errors: errors.slice(0, 10), // Return first 10 errors
        totalErrors: errors.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Import error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
