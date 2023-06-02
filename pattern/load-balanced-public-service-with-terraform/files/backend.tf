terraform {
  cloud {
    organization = "example-org-e17082"

    workspaces {
      name = "lb-workspace"
    }
  }
}