"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { orpc } from "@/lib/orpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

export default function FinancialMcpTestPage() {
  const [ticker, setTicker] = useState("AAPL");
  const [period, setPeriod] = useState<"1mo" | "3mo" | "6mo" | "1y" | "2y">("1mo");
  const [stockPriceData, setStockPriceData] = useState<unknown | null>(null);
  const [companyInfoData, setCompanyInfoData] = useState<unknown | null>(null);
  const [companyNewsData, setCompanyNewsData] = useState<unknown[] | null>(null);
  const [historicalData, setHistoricalData] = useState<unknown[] | null>(null);

  const stockPriceMutation = useMutation(
    orpc.financialMcp.stockPrice.mutationOptions({
      onSuccess: (data) => {
        setStockPriceData(data.data);
        toast.success(`Fetched stock price for ${data.ticker}`);
      },
      onError: (error) => {
        toast.error("Stock price fetch failed", {
          description: getErrorMessage(error),
        });
      },
    })
  );

  const companyInfoMutation = useMutation(
    orpc.financialMcp.companyInfo.mutationOptions({
      onSuccess: (data) => {
        setCompanyInfoData(data.data);
        toast.success(`Fetched company info for ${data.ticker}`);
      },
      onError: (error) => {
        toast.error("Company info fetch failed", {
          description: getErrorMessage(error),
        });
      },
    })
  );

  const companyNewsMutation = useMutation(
    orpc.financialMcp.companyNews.mutationOptions({
      onSuccess: (data) => {
        setCompanyNewsData(data.articles);
        toast.success(`Fetched ${data.articles.length} news articles for ${data.ticker}`);
      },
      onError: (error) => {
        toast.error("Company news fetch failed", {
          description: getErrorMessage(error),
        });
      },
    })
  );

  const historicalPricesMutation = useMutation(
    orpc.financialMcp.historicalPrices.mutationOptions({
      onSuccess: (data) => {
        setHistoricalData(data.dataPoints);
        toast.success(`Fetched ${data.dataPoints.length} historical data points for ${data.ticker}`);
      },
      onError: (error) => {
        toast.error("Historical prices fetch failed", {
          description: getErrorMessage(error),
        });
      },
    })
  );

  const handleStockPriceTest = () => {
    setStockPriceData(null);
    stockPriceMutation.mutate({ ticker: ticker.toUpperCase() });
  };

  const handleCompanyInfoTest = () => {
    setCompanyInfoData(null);
    companyInfoMutation.mutate({ ticker: ticker.toUpperCase() });
  };

  const handleCompanyNewsTest = () => {
    setCompanyNewsData(null);
    companyNewsMutation.mutate({ ticker: ticker.toUpperCase(), maxArticles: 5 });
  };

  const handleHistoricalPricesTest = () => {
    setHistoricalData(null);
    historicalPricesMutation.mutate({ ticker: ticker.toUpperCase(), period });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Financial MCP Test</h1>
        <p className="text-sm text-muted-foreground">
          Test your custom financial MCP server tools via the Arcade Gateway.
        </p>
        <p className="text-xs text-muted-foreground">
          Gateway URL: <code className="rounded bg-muted px-1 py-0.5">https://api.arcade.dev/mcp/financial-portfolio</code>
        </p>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium">Stock Ticker</label>
        <Input
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          placeholder="AAPL, MSFT, GOOGL..."
          className="max-w-xs"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Stock Price Tool */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>get_stock_price</CardTitle>
              <Badge variant="secondary">
                {stockPriceMutation.isPending
                  ? "running"
                  : stockPriceData
                    ? "done"
                    : "idle"}
              </Badge>
            </div>
            <CardDescription>
              Fetches current price, market cap, and 52-week range.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {stockPriceData ? (
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Response
                </p>
                <pre className="max-h-64 overflow-auto text-xs leading-relaxed text-foreground/80">
                  {JSON.stringify(stockPriceData, null, 2)}
                </pre>
              </div>
            ) : null}
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleStockPriceTest}
              disabled={stockPriceMutation.isPending || !ticker}
            >
              {stockPriceMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Fetching...
                </>
              ) : (
                "Test Stock Price"
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* Company Info Tool */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>get_company_info</CardTitle>
              <Badge variant="secondary">
                {companyInfoMutation.isPending
                  ? "running"
                  : companyInfoData
                    ? "done"
                    : "idle"}
              </Badge>
            </div>
            <CardDescription>
              Fetches company name, sector, industry, and description.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {companyInfoData ? (
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Response
                </p>
                <pre className="max-h-64 overflow-auto text-xs leading-relaxed text-foreground/80">
                  {JSON.stringify(companyInfoData, null, 2)}
                </pre>
              </div>
            ) : null}
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleCompanyInfoTest}
              disabled={companyInfoMutation.isPending || !ticker}
            >
              {companyInfoMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Fetching...
                </>
              ) : (
                "Test Company Info"
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* Company News Tool */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>get_company_news</CardTitle>
              <Badge variant="secondary">
                {companyNewsMutation.isPending
                  ? "running"
                  : companyNewsData
                    ? "done"
                    : "idle"}
              </Badge>
            </div>
            <CardDescription>
              Fetches recent news articles (max 5).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {companyNewsData && companyNewsData.length > 0 ? (
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Articles ({companyNewsData.length})
                </p>
                <pre className="max-h-64 overflow-auto text-xs leading-relaxed text-foreground/80">
                  {JSON.stringify(companyNewsData, null, 2)}
                </pre>
              </div>
            ) : null}
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleCompanyNewsTest}
              disabled={companyNewsMutation.isPending || !ticker}
            >
              {companyNewsMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Fetching...
                </>
              ) : (
                "Test Company News"
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* Historical Prices Tool */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>get_historical_prices</CardTitle>
              <Badge variant="secondary">
                {historicalPricesMutation.isPending
                  ? "running"
                  : historicalData
                    ? "done"
                    : "idle"}
              </Badge>
            </div>
            <CardDescription>
              Fetches historical daily close prices.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Period
              </label>
              <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1mo">1 Month</SelectItem>
                  <SelectItem value="3mo">3 Months</SelectItem>
                  <SelectItem value="6mo">6 Months</SelectItem>
                  <SelectItem value="1y">1 Year</SelectItem>
                  <SelectItem value="2y">2 Years</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {historicalData && historicalData.length > 0 ? (
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Data Points ({historicalData.length})
                </p>
                <pre className="max-h-64 overflow-auto text-xs leading-relaxed text-foreground/80">
                  {JSON.stringify(historicalData, null, 2)}
                </pre>
              </div>
            ) : null}
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleHistoricalPricesTest}
              disabled={historicalPricesMutation.isPending || !ticker}
            >
              {historicalPricesMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Fetching...
                </>
              ) : (
                "Test Historical Prices"
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
