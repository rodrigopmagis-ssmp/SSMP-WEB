
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tofbruviyllvdmcllgjx.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvZmJydXZpeWxsdmRtY2xsZ2p4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyNzQyMzQsImV4cCI6MjA4NDg1MDIzNH0.J9zVLpQrwGFY0QttRax1I9u6rtHaB9Qkt5lVUw63QuI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
    console.log('Checking campaigns table...')
    const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .limit(1)

    if (error) {
        console.error('Error:', error.message)
        console.error('Code:', error.code)
        console.error('Details:', error.details)
    } else {
        console.log('Success! Table exists.')
    }
}

check()
