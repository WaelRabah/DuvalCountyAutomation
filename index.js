import  puppeteer from 'puppeteer'
import  tqdm from 'tqdm'
import  { CSVHandler, getRows, getRowsCSV, delay } from './utils.js'


async function runAutomationChunk(start = null, count = null) {

  var output = []
  const rows = await getRows(start, count)
  // Puppeteer automation  
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  login: while (true) {

  try {
    await page.goto('https://core.duvalclerk.com/');

    await page.click('#NavBar1_c_RecordsLoginItem > td')

    // Type login info.


    await page.type('#c_UsernameTextBox', 'mrosenberg@roiglawyers.com');
    await page.type('#c_PasswordTextBox', 'Roig1255!');


    await page.click('#LoginDialog > tbody > tr:nth-child(4) > td:nth-child(2) > input[type=submit]')


    await delay(3000);

    await page.waitForSelector('#c_AccessTypeLabel', { timeout: 5000 })
    const loginStatus = await page.$('#c_AccessTypeLabel')

    const loginStatusText = await (await loginStatus.getProperty('textContent')).jsonValue()
    if (!loginStatusText.includes('Public Access')) {
      continue login
    }

    break
  } catch (error) {
    continue login
  }

  }


  await page.waitForSelector('#c_NavBarContainer > div:nth-child(2) > table > tbody > tr:nth-child(8) > td', { timeout: 10000 })
  for (let row of tqdm(rows)) {

    try {
      await page.goto('https://core.duvalclerk.com/CoreCms.aspx')
      await page.waitForSelector('#ContentPlaceHolder1_WebTab1 > div > div:nth-child(3) > div > table:nth-child(1) > tbody > tr:nth-child(3) > td:nth-child(1) > input', { timeout: 10000 })
      await page.type('#ContentPlaceHolder1_WebTab1 > div > div:nth-child(3) > div > table:nth-child(1) > tbody > tr:nth-child(3) > td:nth-child(1) > input', row['CaseSequenceNumber'])
      await page.waitForSelector('#ContentPlaceHolder1_WebTab1 > div > div:nth-child(3) > div > table:nth-child(1) > tbody > tr:nth-child(4) > td > input[type=button]', { timeout: 5000 })
      await page.click('#ContentPlaceHolder1_WebTab1 > div > div:nth-child(3) > div > table:nth-child(1) > tbody > tr:nth-child(4) > td > input[type=button]')
      await page.waitForSelector('#ContentPlaceHolder1_WebTab1 > div > div:nth-child(4) > div > div.caseDisplayTable.caseSummary > table > tbody > tr:nth-child(2) > td:nth-child(2)', { timeout: 10000 })
      const caseElt = await page.$('#ContentPlaceHolder1_WebTab1 > div > div:nth-child(4) > div > div.caseDisplayTable.caseSummary > table > tbody > tr:nth-child(2) > td:nth-child(2)')
      const caseStatus = await (await caseElt.getProperty('textContent')).jsonValue()

      if (caseStatus.trim().toUpperCase() != row['Status'].toUpperCase()) {
        output.push([row['MatterID'], row['CaseSequenceNumber'], caseStatus, 'N/A'])
      }
    }
    catch {

      output.push([row['MatterID'], row['CaseSequenceNumber'], '', 'CaseSequenceNumber not found on website'])
    }

  }

  await browser.close();

  return output
}

async function runAutomation(chunks = null) {
  if (chunks == null) {
    var output_ = await runAutomation();

    return output_
  }

  var output = []

  for (let chunk of chunks) {
    // chunk 1
    var output_ = await runAutomationChunk(chunk.start, chunk.count);
    output = [...output, ...output_]
  }

  return output
}

(async () => {

  var output = [['MatterID', 'CaseSequenceNumber', 'CaseStatus', 'Message']]

  var chunks = [
    {
      start: 1,
      count: 15
    },
    {
      start: 16,
      count: 15
    },
    {
      start: 31,
      count: 20
    }
  ]

  // leave this empty and remove chunks from the function params, if you want it to work on all the data
  // IE: var output_ = await runAutomation();
  var output_ = await runAutomation(chunks);
  output = [...output, ...output_]



  // write to csv
  CSVHandler.WriteCSV(output, 'C:\\_StreamLine\\Counties_Automation\\Duval\\results.csv')
})();

