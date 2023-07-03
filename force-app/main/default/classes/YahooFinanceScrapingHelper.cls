public with sharing class YahooFinanceScrapingHelper {
    
    public static YahooFinanceScraping.YahooFinanceHTMLWrapper fetchStockData(String ticker, String givenDateMiliseconds, String givenDateMilisecondsPlusOneDay) {
        YahooFinanceScraping.YahooFinanceHTMLWrapper yfw = new YahooFinanceScraping.YahooFinanceHTMLWrapper();
        String stockUrl = 'https://finance.yahoo.com/quote/' + ticker + '/history?period1=' + givenDateMiliseconds + '&period2=' + givenDateMilisecondsPlusOneDay + '&interval=1d&filter=history&frequency=1d&includeAdjustedClose=true';
        String companyUrl = 'https://finance.yahoo.com/quote/' + ticker + '/profile?p=' + ticker;
        String marketCapUrl = 'https://finance.yahoo.com/quote/' + ticker + '?p=' + ticker;
    
        List<String> urls = new List<String>{stockUrl, companyUrl, marketCapUrl};
    
        for (String url : urls) {
            HttpResponse response = YahooFinanceScrapingHelper.makeCallout(url);
    
            if (response.getStatusCode() == 200) {
                if (url == stockUrl) {
                    yfw.stockData = response.getBody();
                } else if (url == companyUrl) {
                    yfw.companyInfo = response.getBody();
                } else if (url == marketCapUrl) {
                    yfw.marketCap = response.getBody();
                }
            }
        }
    
        return yfw;
    }

    
    private static HttpResponse makeCallout(String url) {
        HttpRequest request = new HttpRequest();
        Http http = new Http();
        request.setEndpoint(url);
        request.setMethod('GET');
        HttpResponse response;

        try {
            response = http.send(request);
        } catch (Exception e) {
            throw new AuraHandledException('Failed to retrieve HTML. Error: ' + e.getMessage());
        }

        return response;
    }
}