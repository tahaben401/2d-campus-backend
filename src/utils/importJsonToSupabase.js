import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY =process.env.SUPABASE_KEY ;
const BATCH_SIZE = 100; 



const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function importJsonToSupabase(TABLE_NAME,JSON_FILE_PATH,SKIP_RECORDS) {
  try {
    console.log('Reading JSON file...');
    const jsonData = await fs.readFile(JSON_FILE_PATH, 'utf-8');
    const jsonArray = JSON.parse(jsonData);
    
    // Find the object with type "table" and extract the data array
    const tableObject = jsonArray.find(item => item.type === 'table');
    
    if (!tableObject || !tableObject.data) {
      throw new Error('Could not find table data in JSON file');
    }
    
    const records = tableObject.data;
    
    if (!Array.isArray(records)) {
      throw new Error('Table data must be an array');
    }
    
    // Skip records if needed
    const recordsToImport = SKIP_RECORDS > 0 ? records.slice(SKIP_RECORDS) : records;
    
    console.log(`Found ${records.length} total records`);
    if (SKIP_RECORDS > 0) {
      console.log(`Skipping first ${SKIP_RECORDS} records`);
    }
    console.log(`Importing ${recordsToImport.length} records...`);
    
    // Clean data function
    const cleanRecord = (record) => {
      const cleaned = {};
      for (const [key, value] of Object.entries(record)) {
        // Convert empty strings to null
        if (value === "" || value === null) {
          cleaned[key] = null;
        }
        // Convert invalid dates to null
        else if (typeof value === 'string' && value.startsWith('0000-00-00')) {
          cleaned[key] = null;
        }
        // Keep valid values
        else {
          cleaned[key] = value;
        }
      }
      return cleaned;
    };
    
    // Import in batches
    let imported = 0;
    let errors = 0;
    
    for (let i = 0; i < recordsToImport.length; i += BATCH_SIZE) {
      const batch = recordsToImport.slice(i, i + BATCH_SIZE);
      
      // Clean each record in the batch
      const cleanedBatch = batch.map(cleanRecord);
      
      const { data: result, error } = await supabase
        .from(TABLE_NAME)
        .insert(cleanedBatch);
      
      if (error) {
        console.error(`Error in batch ${i / BATCH_SIZE + 1}:`, error.message);
        errors += batch.length;
      } else {
        imported += batch.length;
        console.log(`Imported ${imported}/${recordsToImport.length} records...`);
      }
    }
    
    console.log('\n✅ Import complete!');
    console.log(`Successfully imported: ${imported}`);
    console.log(`Errors: ${errors}`);
    
    return {
      imported,
      errors,
      total: recordsToImport.length
    };
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    throw error;
  }
}

export default importJsonToSupabase;