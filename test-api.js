const API_URL = "https://script.google.com/macros/s/AKfycby3nsamwH06zabOU8j1kvnaoHz4n7w1w8Skal7PRS7Jzr_payb26cBLnpGTYwyhX7fj/exec";

async function testTranslate() {
  console.log("Testing translate action...");
  try {
    const res = await fetch(API_URL + "?action=translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: "こんにちは"
      })
    });
    
    console.log("Response status:", res.status);
    const data = await res.json();
    console.log("Translate response:", data);
  } catch (error) {
    console.error("Translate error:", error);
  }
}

async function testChat() {
  console.log("\nTesting chat action...");
  try {
    const res = await fetch(API_URL + "?action=chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "Translate 'こんにちは' from Japanese to Dzongkha. Return only JSON with format: {\"targetText\": \"translation\"}"
      })
    });
    
    console.log("Response status:", res.status);
    const data = await res.json();
    console.log("Chat response:", data);
  } catch (error) {
    console.error("Chat error:", error);
  }
}

async function runTests() {
  await testTranslate();
  await testChat();
}

runTests();
