package main

import (
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"time"
)

const (
	exitCodeError   = 1
	exitCodeSuccess = 0
)

var (
	outfile, _ = os.Create("/proc/1/fd/1")
	logger     = slog.New(slog.NewJSONHandler(outfile, nil))
)

func runHealthcheck(url string, timeout time.Duration) int {
	logger.Info(fmt.Sprintf("Querying Endpoint %v", url))

	client := &http.Client{
		Timeout: timeout,
	}
	r, err := http.NewRequest("HEAD", url, nil)
	if err != nil {
		logger.Error(fmt.Sprintf("error creating healthcheck request: %v", err))
		return exitCodeError
	}

	resp, err := client.Do(r)
	if err != nil {
		logger.Error(fmt.Sprintf("Health check %s: Error %s", url, err))
		return exitCodeError
	}
	resp.Body.Close()

	logger.Info(fmt.Sprintf("Health check %s: HTTP status code %s", url, resp.Status))
	return exitCodeSuccess
}

func main() {
	healthcheckURL := "http://localhost:8080/health"
	healthcheckTimeout := time.Second * 5
	logger.Info(fmt.Sprintf("Starting Health Check to %v", healthcheckURL))

	exitcode := runHealthcheck(healthcheckURL, healthcheckTimeout)
	os.Exit(exitcode)
}
