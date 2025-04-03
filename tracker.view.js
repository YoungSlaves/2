// functions/track-view.js
const { Client, query } = require('faunadb');

// Initialize the FaunaDB client with your secret
const client = new Client({
  secret: process.env.FAUNA_SECRET_KEY,
});

exports.handler = async function(event, context) {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Check if our collection exists, if not create it
    let viewCount;
    
    try {
      // Try to get the current view count
      const result = await client.query(
        query.Get(
          query.Match(query.Index('view_count_by_page'), 'saponify_homepage')
        )
      );
      viewCount = result.data.count;
      
      // Increment the view count
      await client.query(
        query.Update(result.ref, {
          data: {
            count: viewCount + 1
          }
        })
      );
      
      viewCount += 1; // Update local variable with new count
    } catch (error) {
      // If the document doesn't exist, create it
      console.log('Creating new view counter document');
      
      try {
        // Create the collection if it doesn't exist
        await client.query(
          query.If(
            query.Exists(query.Collection('page_views')),
            true,
            query.CreateCollection({ name: 'page_views' })
          )
        );
        
        // Create the index if it doesn't exist
        await client.query(
          query.If(
            query.Exists(query.Index('view_count_by_page')),
            true,
            query.CreateIndex({
              name: 'view_count_by_page',
              source: query.Collection('page_views'),
              terms: [{ field: ['data', 'page'] }],
              unique: true
            })
          )
        );
        
        // Create the initial document
        const result = await client.query(
          query.Create(
            query.Collection('page_views'),
            {
              data: {
                page: 'saponify_homepage',
                count: 1
              }
            }
          )
        );
        
        viewCount = 1;
      } catch (err) {
        console.error('Error setting up database:', err);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to set up database' })
        };
      }
    }
    
    // Return the updated view count
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ viewCount })
    };
  } catch (error) {
    console.error('Error tracking view:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to track view' })
    };
  }
};
