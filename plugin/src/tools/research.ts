const EDGAR_SEARCH = "https://efts.sec.gov/LATEST/search-index";
const EDGAR_SUBMISSIONS = "https://data.sec.gov/submissions";

export async function searchSecEdgar(
  query: string,
  formType = "10-K",
  fetchText = false
): Promise<object> {
  // Step 1: full-text search for filings
  const searchUrl =
    `${EDGAR_SEARCH}?q=${encodeURIComponent(query)}&forms=${encodeURIComponent(formType)}&dateRange=custom&startdt=2022-01-01&_source=file_date,entity_name,file_num,period_of_report,file_type,biz_location,inc_states,form_type&hits.hits.total.value=true&hits.hits._source=true&hits.hits.highlight=false`;

  const searchRes = await fetch(searchUrl, {
    headers: { "User-Agent": "investment-research-plugin/0.1 contact@example.com" },
  });
  const searchData = (await searchRes.json()) as any;
  const hits = searchData?.hits?.hits ?? [];

  const filings = hits.slice(0, 5).map((h: any) => ({
    entityName: h._source?.entity_name,
    formType: h._source?.form_type,
    filedAt: h._source?.file_date,
    period: h._source?.period_of_report,
    accessionNumber: h._id,
  }));

  if (!fetchText || filings.length === 0) {
    return { query, formType, filings };
  }

  // Step 2: fetch text of most recent filing
  const latest = filings[0];
  const accession = latest.accessionNumber?.replace(/-/g, "");
  let text = "";
  try {
    const indexUrl = `https://www.sec.gov/Archives/edgar/data/${accession}/index.json`;
    const indexRes = await fetch(indexUrl, {
      headers: { "User-Agent": "investment-research-plugin/0.1 contact@example.com" },
    });
    const indexData = (await indexRes.json()) as any;
    const primaryDoc = indexData?.directory?.item?.find(
      (i: any) => i.type === "10-K" || i.name?.endsWith(".htm") || i.name?.endsWith(".txt")
    );
    if (primaryDoc) {
      const docUrl = `https://www.sec.gov/Archives/edgar/data/${accession}/${primaryDoc.name}`;
      const docRes = await fetch(docUrl, {
        headers: { "User-Agent": "investment-research-plugin/0.1 contact@example.com" },
      });
      const raw = await docRes.text();
      // strip HTML tags, limit to 20k chars
      text = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 20000);
    }
  } catch {
    text = "[Could not fetch filing text]";
  }

  return { query, formType, filings, latestFilingText: text };
}

export async function fetchMarketNews(
  query: string,
  newsApiKey: string,
  days = 7,
  maxArticles = 10
): Promise<object> {
  const from = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&from=${from}&sortBy=relevancy&pageSize=${maxArticles}&apiKey=${newsApiKey}`;

  const res = await fetch(url);
  const data = (await res.json()) as any;

  if (data.status !== "ok") {
    return { error: data.message ?? "NewsAPI error", query };
  }

  const articles = (data.articles ?? []).map((a: any) => ({
    title: a.title,
    source: a.source?.name,
    publishedAt: a.publishedAt,
    url: a.url,
    description: a.description,
  }));

  return { query, from, totalResults: data.totalResults, articles };
}

export async function getPriceData(
  symbol: string,
  fmpApiKey: string,
  includeFinancials = true
): Promise<object> {
  const base = "https://financialmodelingprep.com/api/v3";
  const headers = { "User-Agent": "investment-research-plugin/0.1" };

  const [profileRes, ratioRes] = await Promise.all([
    fetch(`${base}/profile/${symbol}?apikey=${fmpApiKey}`, { headers }),
    fetch(`${base}/ratios-ttm/${symbol}?apikey=${fmpApiKey}`, { headers }),
  ]);

  const [profileData, ratioData] = await Promise.all([
    profileRes.json() as Promise<any>,
    ratioRes.json() as Promise<any>,
  ]);

  const profile = Array.isArray(profileData) ? profileData[0] : profileData;
  const ratios = Array.isArray(ratioData) ? ratioData[0] : ratioData;

  const result: any = {
    symbol,
    name: profile?.companyName,
    price: profile?.price,
    change: profile?.changes,
    changePct: profile?.changesPercentage,
    marketCap: profile?.mktCap,
    beta: profile?.beta,
    range52w: `${profile?.range}`,
    sector: profile?.sector,
    industry: profile?.industry,
    description: profile?.description?.slice(0, 500),
    peRatioTTM: ratios?.peRatioTTM,
    evToEbitdaTTM: ratios?.enterpriseValueMultipleTTM,
    priceToBookTTM: ratios?.priceToBookRatioTTM,
    debtToEquityTTM: ratios?.debtEquityRatioTTM,
  };

  if (includeFinancials) {
    const incomeRes = await fetch(
      `${base}/income-statement/${symbol}?limit=1&apikey=${fmpApiKey}`,
      { headers }
    );
    const incomeData = (await incomeRes.json() as any);
    const income = Array.isArray(incomeData) ? incomeData[0] : null;
    if (income) {
      result.revenue = income.revenue;
      result.netIncome = income.netIncome;
      result.ebitda = income.ebitda;
      result.fiscalYear = income.calendarYear;
    }
  }

  return result;
}
