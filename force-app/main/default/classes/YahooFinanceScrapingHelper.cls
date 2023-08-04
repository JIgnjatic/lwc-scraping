public with sharing class YahooFinanceScrapingHelper {
    
    public static YahooFinanceScraping.YahooFinanceHTMLWrapper fetchStockData(String ticker, String givenDateMiliseconds, String givenDateMilisecondsPlusOneDay) {
        YahooFinanceScraping.YahooFinanceHTMLWrapper yfw = new YahooFinanceScraping.YahooFinanceHTMLWrapper();
        String stockUrl = 'https://finance.yahoo.com/quote/' + ticker + '/history?period1=' + givenDateMiliseconds + '&period2=' + givenDateMilisecondsPlusOneDay + '&interval=1d&filter=history&frequency=1d&includeAdjustedClose=true';
        String companyUrl = 'https://finance.yahoo.com/quote/' + ticker + '/profile?p=' + ticker;
        String marketCapUrl = 'https://finance.yahoo.com/quote/' + ticker + '?p=' + ticker;
    
        List<String> urls = new List<String>{stockUrl, companyUrl, marketCapUrl};
    
        for (String url : urls) {
            HttpResponse response = makeCallout(url);
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

    @testVisible
    public static HttpResponse makeCallout(String url) {
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


    public static YahooFinanceScraping.YahooLWCResponse regexScrape(YahooFinanceScraping.YahooFinanceHTMLWrapper yfw){

        String stockDataRegex = '<span>(\\d+\\.\\d+)</span>';
        String marketCapRegex = '(?<=data-test="MARKET_CAP-value">)([0-9.]+)[TMB]?';
        String addressRegex = '<p class="D\\(ib\\) W\\(47\\.727%\\) Pend\\(40px\\)">(.*?)<br/>(.*?)<br/>(.*?)<br/>';
        String yearFoundedRegexOption1 = '(?<=founded in) \\d{4}'; 
        String yearFoundedRegexOption2 = '(?<=incorporated in) \\d{4}'; 
        String numOfEmployeesRegex = '<span>(\\d+),(\\d+)</span>';
        String fullNameRegex = '<h1 class="D\\(ib\\) Fz\\(18px\\)">(.*?) (.*?) ';

        YahooFinanceScraping.YahooLWCResponse responseWrapper = new YahooFinanceScraping.YahooLWCResponse();
        
        responseWrapper.openPrice = extractDataViaRegexMultipleMatchers(yfw.stockData, stockDataRegex, 0);
        responseWrapper.closePrice = extractDataViaRegexMultipleMatchers(yfw.stockData, stockDataRegex, 3);
        responseWrapper.previousClosePrice = extractDataViaRegexMultipleMatchers(yfw.stockData, stockDataRegex, 9);

        responseWrapper.companyAddress = extractDataViaRegexOneMatcher(yfw.companyInfo, addressRegex, new List<Integer>{1,2,3});
        responseWrapper.employeeNumber = extractDataViaRegexOneMatcher(yfw.companyInfo, numOfEmployeesRegex, new List<Integer>{1,2});
        responseWrapper.name = extractDataViaRegexOneMatcher(yfw.companyInfo, fullNameRegex, new List<Integer>{1,2});


        String yearFoundedRes1 = extractDataViaRegexOneMatcher(yfw.companyInfo, yearFoundedRegexOption1, new List<Integer>{1});
        String yearFoundedRes2 = extractDataViaRegexOneMatcher(yfw.companyInfo, yearFoundedRegexOption2, new List<Integer>{1});

        responseWrapper.yearFounded = yearFoundedRes1 != null ? yearFoundedRes1 : yearFoundedRes2;

        return responseWrapper;

    }

    private static String extractDataViaRegexOneMatcher(String data, String regex, List<Integer> groupNumbers){

        Pattern pattern = Pattern.compile(regex);
        Matcher matcher = pattern.matcher(data);
        String address = '';

        while (matcher.find()) {
            Integer i=0;
            String extractedValue = matcher.group(i);

            if (groupNumbers.contains(i)) {
                address += extractedValue + ', ';
            }

        }
        //removing the last comma
        address = address.removeEnd(', ');

        return address;
    }

    private static String extractDataViaRegexMultipleMatchers(String data, String regex, Integer matcherNumber){

        Pattern pattern = Pattern.compile(regex);
        Matcher matcher = pattern.matcher(data);
        String extractedValue = '';

        while (matcher.find()) {
            Integer i=0;

            extractedValue = matcher.group(1);
            System.debug('Extracted value: ' + extractedValue);
               
            if(i == matcherNumber){
                return extractedValue;
            }
            i=i++;

        }
        return extractedValue;
                                                                            
    }

    public static Stock_Data__c parseWrapperToStockData(YahooFinanceScraping.YahooLWCResponse ywr){

        Stock_Data__c sd = new Stock_Data__c();
        sd.Name = ywr.ticker + ' ' + ywr.givenDate;
        sd.Ticker_Symbol__c = ywr.ticker;
        sd.Date__c = Date.valueOf(ywr.givenDate);
        sd.Open_Price__c = Decimal.valueOf(ywr.openPrice);
        sd.Close_Price__c = Decimal.valueOf(ywr.closePrice);
        sd.Market_Cap__c = String.valueOf(ywr.marketCap);
        sd.Employee_Number__c = ywr.employeeNumber;
        sd.Company_Address__c = ywr.companyAddress;
        sd.Industry__c = ywr.industry;
        //sd.Year_Founded__c = ywr.yearFounded;

        return sd;
    }

}