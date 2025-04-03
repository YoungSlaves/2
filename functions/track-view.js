// Using FaunaDB as the database
const faunadb = require('faunadb');
const q = faunadb.query;

// Initialize the FaunaDB client with your secret
// You'll set this in Netlify environment variables
const client = new faunadb.Client({
  secret: process.env.FAUNA_SECRET_KEY
});

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // Check if our counter document exists
    let viewCount;
    
    try {
      // Try to get the current view count
      const result = await client.query(
        q.Get(q.Match(q.Index('view_counter_by_id'), 'page_views'))
      );
      
      // Increment the existing count
      viewCount = result.data.count + 1;
      
      // Update the document with the new count
      await client.query(
        q.Update(result.ref, {
          data: { count: viewCount }
        })
      );
    } catch (error) {
      // If document doesn't exist, create it with count = 1
      viewCount = 1;
      await client.query(
        q.Create(q.Collection('view_counters'), {
          data: { 
            id: 'page_views',
            count: viewCount 
          }
        })
      );
    }

    // Return the updated count to the client
    return {
      statusCode: 200,
      body: JSON.stringify({ viewCount })
    };
  } catch (error) {
    console.error('Database error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Database operation failed' })
    };
  }
};