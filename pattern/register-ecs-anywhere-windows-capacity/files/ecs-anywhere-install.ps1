<#
    .SYNOPSIS
    Performs installation/maintenance of various components for running Amazon ECS on customer managed external instances.

    .DESCRIPTION
    This script enables customers to run Amazon ECS on external instances by supporting-
    - Installation of AWS SSM on the instance
    - Registration of the external instance as an AWS SSM managed instance
    - Installation of ECSTools Powershell module to support Amazon ECS
    - Installation of Amazon ECS container runtime on the instance
    - Installation of Amazon ECS Agent on the instance
    - Uninstallation of Amazon ECS Anywhere components from the customer managed instance
    - Updating Amazon ECS container agent running on the instance

    NOTE: Please run this script with Administrator privileges.

    .PARAMETER Region
    [Optional] Specifies the region of Amazon ECS Cluster and AWS SSM activation. It is required unless -Uninstall is specified.

    .PARAMETER ActivationID
    [Optional] Specifies activation id from the create activation command. Not required if -SkipRegistration or -Uninstall is specified.

    .PARAMETER ActivationCode
    [Optional] Specifies activation code from the create activation command. Not required if -SkipRegistration or -Uninstall is specified.

    .PARAMETER Cluster
    [Optional] Specifies the cluster name to which the Amazon ECS agent will connect to. Defaults to 'default'.

    .PARAMETER ECSVersion
    [Optional] Specifies the Amazon ECS agent version which would be installed on the instance. Defaults to 'latest'.

    .PARAMETER SkipRegistration
    [Optional] Specifies that SSM installation and registration of instance to SSM can be skipped.

    .PARAMETER ContainerRuntimeVersion
    [Optional] Specifies the container runtime version to be installed on the instance. Defaults to 'latest'.

    .PARAMETER Uninstall
    [Optional] Specifies if the uninstallation needs to be performed on the instance.

    .PARAMETER ECSEndpoint
    [Optional] Specifies the endpoint to which the Amazon ECS agent would connect.

    .PARAMETER ECSToolsS3BucketName
    [Optional] Specifies the S3 endpoint bucket to pull the ECSTools module from.

    .INPUTS
    None. You cannot pipe objects to this script.

    .OUTPUTS
    None. This script does not generate an output object.

    .EXAMPLE
    PS> .\ecs-anywhere-install.ps1 -Region us-west-2 -ActivationID <ID> -ActivationCode <Code> -Cluster ecs-anywhere
    Installs Container runtime, AWS SSM, and Amazon ECS (latest container agent) on the instance. It also registers the instance with AWS SSM and registers the instance to Amazon ECS cluster.

    .EXAMPLE
    PS> .\ecs-anywhere-install.ps1 -Region us-west-2 -ActivationID <ID> -ActivationCode <Code> -Cluster ecs-anywhere -ECSVersion 1.57.0
    Installs a specific version of Amazon ECS agent on the instance along with other dependencies as Example 1.

    .EXAMPLE
    PS> .\ecs-anywhere-install.ps1 -Region us-west-2 -ActivationID <ID> -ActivationCode <Code> -Cluster ecs-anywhere -ContainerRuntimeVersion 20.10.7
    Installs a specific version of ContainerRuntimeVersion on the instance along with other dependencies as Example 1.

    .EXAMPLE
    PS> .\ecs-anywhere-install.ps1 -Region us-west-2 -SkipRegistration -Cluster ecs-anywhere
    Installs only container runtime and Amazon ECS on the instance.

    .EXAMPLE
    PS> .\ecs-anywhere-install.ps1 -Region us-west-2 -SkipRegistration -Cluster ecs-anywhere -ECSVersion 1.56.0
    Installs a specific version of Amazon ECS agent on the instance. This can be used for updating the container agent running on the instance.

    .EXAMPLE
    PS> .\ecs-anywhere-install.ps1 -Uninstall
    Stops and removes the AWS SSM and Amazon ECS services from the customer instance.

    .LINK
    Amazon ECS Anywhere documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-anywhere.html

    .NOTES
    Amazon ECS Anywhere on Windows is supported only for the following Windows releases-
    - Windows Server 2022
    - Windows Server 20H2
    - Windows Server 2019
    - Windows Server 2016
#>

#Requires -RunAsAdministrator

Param (
    [Parameter(Mandatory=$false)]
    [ValidateNotNullOrEmpty()]
    [string]$Region,

    [Parameter(Mandatory=$false)]
    [ValidateNotNullOrEmpty()]
    [string]$ActivationID,

    [Parameter(Mandatory=$false)]
    [ValidateNotNullOrEmpty()]
    [string]$ActivationCode,

    [Parameter(Mandatory=$false)]
    [ValidateNotNullOrEmpty()]
    [string]$Cluster = "default",

    [Parameter(Mandatory=$false)]
    [ValidateNotNullOrEmpty()]
    [string]$ECSVersion = "latest",

    [Parameter(Mandatory=$false)]
    [ValidateNotNullOrEmpty()]
    [switch]$SkipRegistration,

    [Parameter(Mandatory=$false)]
    [ValidateNotNullOrEmpty()]
    [string]$ContainerRuntimeVersion = "latest",

    [Parameter(Mandatory=$false)]
    [ValidateNotNullOrEmpty()]
    [switch]$Uninstall,

    [Parameter(Mandatory=$false)]
    [string]$ECSEndpoint,

    [Parameter(Mandatory=$false)]
    [string]$ECSToolsS3BucketName
)

Function Initialize-ScriptDependencies {
    # AllowedOSBuildNumberToRelease corresponds to the map of build number of allowed Windows releases to the release name.
    # Reference- https://docs.microsoft.com/en-us/windows-server/get-started/windows-server-release-info
    [HashTable]$Script:AllowedOSBuildNumberToRelease = @{
        "20348"="2022";
        "19042"="20H2";
        "17763"="2019";
        "14393"="2016";
    }

    # TempDirectory is the temporary directory created to store the artifacts.
    [String]$Script:TempDirectory = Join-Path $env:TEMP (New-Guid)

    # Remove the contents of temp directory if it exists. Otherwise, create a new folder.
    if (Test-Path -Path $Script:TempDirectory) {
        Remove-Item -Path $Script:TempDirectory/* -Recurse -Force
    } else {
        New-Item -Path $Script:TempDirectory -ItemType Directory
    }

    # ECSProgramData is the Amazon ECS ProgramData directory.
    [String]$Script:ECSProgramData = Join-Path $ENV:ProgramData "Amazon\ECS"
    # ECSCache is the cache location for ECS artifacts.
    [String]$Script:ECSCache = Join-Path $ENV:ProgramData "Amazon\ECS\cache"
    # ECSModulePath is the path of ECSTools powershell module.
    [String]$Script:ECSModulePath = Join-Path $ENV:ProgramFiles "WindowsPowerShell\Modules\ECSTools"
    # ECSInstallationPath is the path of Amazon ECS artifacts on the instance.
    [String]$Script:ECSInstallationPath = Join-Path $ENV:ProgramFiles "Amazon\ECS"

    # S3URLSuffix is the suffix for the S3 URLs. For example- In China regions, this would be .cn
    [String]$Script:S3URLSuffix = ""
    if ($Region.StartsWith("cn-")) {
        $Script:S3URLSuffix = ".cn"
    }

    # SSMAgentInstaller is the name of the Amazon SSM agent installer.
    [String]$Script:SSMAgentInstaller = "AmazonSSMAgentSetup.exe"
    # SSMAgentS3URL is the S3 url for AWS SSM Agent installer.
    [String]$Script:SSMAgentS3URL = Join-S3PathParts -S3Bucket  "https://amazon-ssm-$($Region).s3.$($Region).amazonaws.com$($Script:S3URLSuffix)/latest/windows_amd64" -FileName $Script:SSMAgentInstaller
    # SSMAgentInstallerFullPath is the absolute path of the location of SSM agent installer.
    [String]$Script:SSMAgentInstallerFullPath = Join-Path $Script:TempDirectory $Script:SSMAgentInstaller

    # SSMBinPath is the path where SSM agent would be installed.
    # On Windows, this path is the default path of 'C:\Program Files\Amazon\SSM' and cannot be changed.
    [String]$Script:SSMBinPath = Join-Path $ENV:ProgramFiles "Amazon\SSM"
    # ECSExecArtifactsArchiveName is the name of the ECS Exec artifacts archive.
    [string]$Script:ECSExecArtifactsArchiveName = "execute-command-binaries.zip"
    # AmazonECSExecBinaries is the list of SSM binaries required for ECS Exec on Windows.
    [Array]$Script:AmazonECSExecBinaries = "amazon-ssm-agent.exe","ssm-agent-worker.exe","ssm-session-logger.exe","ssm-session-worker.exe","Plugins\SessionManagerShell\winpty.dll","Plugins\SessionManagerShell\winpty-agent.exe"

    # ECSAgentSourceBucket is the source bucket for the agent artifacts.
    [String]$Script:ECSAgentSourceBucket = "amazon-ecs-agent-$($Region)"
    if (-not([string]::IsNullOrEmpty($ECSToolsS3BucketName)))
    {
        $Script:ECSAgentSourceBucket = $ECSToolsS3BucketName
    }

    [String]$ECSToolsS3BucketRoot = "https://s3.$($Region).amazonaws.com$($Script:S3URLSuffix)/$($Script:ECSAgentSourceBucket)"
    # ECSToolsPSM1 is the name for the file ECSTools.psm1.
    [String]$Script:ECSToolsPSM1 = "ECSTools.psm1"
    # ECSToolsPSD1 is the name for the file ECSTools.psd1.
    [String]$Script:ECSToolsPSD1 = "ECSTools.psd1"
    # ECSToolsPSM1S3URL is the S3 url for ECSTools.psm1.
    [String]$Script:ECSToolsPSM1S3URL = Join-S3PathParts -S3Bucket $ECSToolsS3BucketRoot -FileName "ECSTools.psm1"
    # ECSToolsPSD1S3URL is the S3 url for ECSTools.psd1.
    [String]$Script:ECSToolsPSD1S3URL = Join-S3PathParts -S3Bucket $ECSToolsS3BucketRoot -FileName "ECSTools.psd1"

    # SSMAgentServiceName is the name of the Amazon SSM Agent service.
    [String]$Script:SSMAgentServiceName = "AmazonSSMAgent"
    # AmazonECSServiceName is the name of the Amazon ECS Agent service.
    [String]$Script:AmazonECSServiceName = "AmazonECS"
    # ECSContainerRuntimeName is the name of the ECS container runtime.
    [String]$Script:ECSContainerRuntimeName = "Docker"
}

Function Write-Log {
    <#
    .SYNOPSIS
    This is a helper method for writing the output logs to stdout.
    #>
    [cmdletbinding()]
    Param (
        $Message
    )

    $fullMessage = "$(((Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ'))) - $($message)"
    Write-Host $fullMessage
}

Function Join-S3PathParts {
    Param (
        [ValidateNotNullOrEmpty()]
        [string]$S3Bucket,

        [ValidateNotNullOrEmpty()]
        [string]$FileName
    )

    if ($S3Bucket[$S3Bucket.Length - 1] -ne '/')
    {
        return "{0}/{1}" -f $S3Bucket, $FileName
    }
    return $S3Bucket + $FileName
}

Function Test-OSRelease {
    <#
    .SYNOPSIS
    This method tests if the current OS release is supported by Amazon ECS Anywhere.
    #>

    [String]$CurrentOSBuildNumber = $PSVersionTable.PSVersion.Build
    if (-not $Script:AllowedOSBuildNumberToRelease.ContainsKey($CurrentOSBuildNumber)) {
        throw "The current Windows release with build number {0} is not supported." -f $CurrentOSBuildNumber
    }
    Write-Log ("OS release {0} is supported" -f $Script:AllowedOSBuildNumberToRelease[$CurrentOSBuildNumber])
}

Function Test-ScriptParameters {
    <#
    .SYNOPSIS
    This method performs validation of the parameters for the script.
    #>

    if (-not $Uninstall)
    {
        if (-not $Cluster) {
            throw "Cluster is required unless -Uninstall was specified"
        }

        if ((-not $SkipRegistration) -and ((-not $ActivationCode) -or (-not $ActivationID)))
        {
            throw "Activation Code and ID are required if -SkipRegistration is not used."
        }

        if ($SkipRegistration) {
            # If the registration is skipped then the SSM Agent service must be running.
            Test-ServiceStatus -ServiceName $Script:SSMAgentServiceName
        }
    }
}

Function Get-FileFromS3 {
    <#
    .SYNOPSIS
    This method downloads a file from Amazon S3 at the specified path.
    #>
    [CmdletBinding()]
    Param (
        [Parameter(Mandatory=$true)]
        [ValidateNotNullOrEmpty()]
        [string]$S3FileURL,

        [Parameter(Mandatory=$true)]
        [ValidateNotNullOrEmpty()]
        [string]$OutputFilePath
    )

    Begin {
        if (Test-Path -Path $OutputFilePath) {
            Write-Log ("Existing file found at {0}. Deleting it." -f $OutputFilePath)
            Remove-Item -Recurse -Force $OutputFilePath
        }
    } Process {
            try {
                Write-Log ("Downloading file from S3: {0}" -f $S3FileURL)
                Invoke-RestMethod -Uri $S3FileURL -OutFile $OutputFilePath
            } catch {
                throw "Error downloading file from S3: {0} at {1}. Message: {2}" -f $S3FileURL,$OutputFilePath,$_.Exception.Message
            }
    } End {
        if (-not (Test-Path -Path $OutputFilePath)) {
            throw "Failed to download file from S3: {0} at {1}. Message: {2}" -f $S3FileURL,$OutputFilePath,$_.Exception.Message
        }
    }
}

Function Test-ServiceStatus {
    <#
    .SYNOPSIS
    This method tests if the specified service is in running status.
    #>
    [CmdletBinding()]
    Param (
        [Parameter(Mandatory=$true)]
        [ValidateNotNullOrEmpty()]
        [string]$ServiceName,

        [Parameter(Mandatory=$false)]
        [ValidateNotNullOrEmpty()]
        [int]$SleepTime = 5
    )

    if (-not (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue)) {
        throw "{0} service not found" -f $ServiceName
    }

    Write-Log ("Validating if the {0} service is running..." -f $ServiceName)
    for ($iteration=1; $iteration -le 10; $iteration++) {
        if ((Get-Service -Name $ServiceName).Status -eq "Running") {
            Write-Log ("{0} service is running!" -f $ServiceName)
            return
        } else {
            Write-Log ("{0} service is not running. Waiting for it to move into running status after {1} retry." -f $ServiceName,$iteration)
            Start-Sleep $SleepTime
        }
    }

    throw "{0} service failed to start" -f $ServiceName
}

Function Install-SSMAgent {
    <#
    .SYNOPSIS
    This method downloads and installs the AWS SSM agent.
    It also registers the external instance with AWS SSM using the provided activation code and ID.
    #>

    try {
        # Download SSM Agent installer from S3.
        Get-FileFromS3 -S3FileURL $Script:SSMAgentS3URL -OutputFilePath $Script:SSMAgentInstallerFullPath
        # TODO: Currently, SSM Agent does not publish hash for their artifacts and therefore, we are not validating the hash for now.
        # In the future, when hash is published along with the agent artifacts, we need to start validating the hash as well.

        # Remove any existing SSM artifacts before starting a fresh install.
        Remove-SSMArtifacts

        # Install latest SSM agent on the instance.
        Write-Log "Starting installation of Amazon SSM agent..."
        Start-Process $Script:SSMAgentInstallerFullPath -ArgumentList @("/q", "/log", "install.log", "CODE=$($ActivationCode)", "ID=$($ActivationID)", "REGION=$($Region)") -Wait
        Test-ServiceStatus -ServiceName $Script:SSMAgentServiceName
    } catch {
        throw "Failed to install SSM agent on the instance: {0}" -f $_.Exception.Message
    }
}

Function Install-ContainerRuntime {
    <#
    .SYNOPSIS
    This method downloads and installs container runtime for Amazon ECS.
    #>

    try {
        Write-Log "Starting installation of ECS container runtime..."
        Import-Module ECSTools
        $RestartNeeded = Install-ECSRuntime -RequiredVersion $ContainerRuntimeVersion
        if ($RestartNeeded) {
            Write-Log "Restart the system to complete installation of Windows feature: Containers"
            exit 0
        }
        Test-ServiceStatus $Script:ECSContainerRuntimeName
    } catch {
        throw "Failed to install container runtime on the instance: {0}" -f $_.Exception.Message
    }
}

Function Install-ECSToolsModule {
    <#
    .SYNOPSIS
    This method downloads and installs the ECSTools Powershell module.
    #>

    try {
        Write-Log "Starting installation of ECSTools powershell module..."

        $ECSToolsPSM1FullPath = Join-Path $Script:TempDirectory $Script:ECSToolsPSM1
        Get-FileFromS3 -S3FileURL $Script:ECSToolsPSM1S3URL -OutputFilePath $ECSToolsPSM1FullPath

        $ECSToolsPSD1FullPath = Join-Path $Script:TempDirectory $Script:ECSToolsPSD1
        Get-FileFromS3 -S3FileURL $Script:ECSToolsPSD1S3URL -OutputFilePath $ECSToolsPSD1FullPath

        # If module exists in the current session, then remove it.
        Get-Module -Name ECSTools | Remove-Module

        # Remove the module itself from Powershell.
        if (Test-Path -Path $Script:ECSModulePath) {
            Remove-Item -Recurse -Force -Path $Script:ECSModulePath
        }

        # Add the downloaded module to the Powershell.
        Write-Log "Setting up ECSTools inside powershell modules."
        New-Item -ItemType "directory" -Path $Script:ECSModulePath
        Copy-Item $ECSToolsPSM1FullPath -Destination $Script:ECSModulePath
        Copy-Item $ECSToolsPSD1FullPath -Destination $Script:ECSModulePath
        if ((-not (Test-Path $Script:ECSModulePath)) -or ((Get-ChildItem $Script:ECSModulePath | Measure-Object).Count -ne 2)) {
            throw "Expected files for ECSTools not found."
        }

        if (-not (Get-Module -ListAvailable -Name ECSTools)) {
            throw "ECSTools not found among installed powershell modules."
        }
    } catch {
        throw "Failed to install ECSTools module on the instance: {0}" -f $_.Exception.Message
    }
}

Function Compress-ECSExecArtifacts {
    <#
    .SYNOPSIS
    This method creates the artifact archive required for ECS Exec initialization.
    Since we are installing SSM on the instance using the installer, therefore, all the
    required binaries would be present on the instance. We copy them into an archive.
    #>

    try {
        Write-Log "Starting creation of ECS Exec artifacts archive..."

        $archivePath = "$Script:ECSProgramData\$Script:ECSExecArtifactsArchiveName"
        # If the archive exists, then return.
        # Only in case of uninstallation, we would remove the cache.
        if (Test-Path -Path $archivePath) {
            Write-Log "ECS Exec artifacts archive already exists."
            return
        }

        # Temp directory where all the files will be copied.
        $tempPath = "C:\ecs-exec-artifacts"
        New-Item -Path $tempPath -ItemType "directory"

        Write-Log "Copying required binaries into $tempPath"
        foreach ($bin in $Script:AmazonECSExecBinaries) {
            $binSourcePath = "$SSMBinPath\$bin"
            $binDestinationPath = "$tempPath\$bin"

            if (!(Test-Path -path "$binSourcePath")) {
                throw "$binSourcePath not found"
            }

            # Create parent path for destination if it doesn't exist.
            # This is required for nested folders.
            $rootPath = Split-Path -Path $binDestinationPath
            if (-not (Test-Path -Path $rootPath)) {
                New-Item -Type Directory -Path $rootPath | Out-Null
            }
            # Copy the binary to the temp folder.
            Copy-Item -Path "$binSourcePath" -Destination "$binDestinationPath"
        }

        # Create the cache folder if not present.
        if (-not (Test-Path -Path $Script:ECSCache)) {
            New-Item -Path $Script:ECSCache -ItemType "directory"
        }

        # Create the archive.
        Write-Log "Compressing the artifacts into a zip."
        Compress-Archive -Path "$tempPath\*" -DestinationPath $archivePath

        # Remove the temp folder where we copied the binaries.
        Remove-Item -Recurse -Force $tempPath
    } catch {
        throw "Failed to create ECS Exec artifacts archive : {0}" -f $_.Exception.Message
    }
}

Function Install-ECSAgent {
    <#
    .SYNOPSIS
    This method downloads and installs the Amazon ECS Agent on the instance along with all the prerequisites.

    .DESCRIPTION
    This method performs the following actions-
    - Downloads the required version of Amazon ECS agent
    - Sets up various environment variables required for Amazon ECS agent to run on the external instance
    - Starts Amazon ECS Agent as a Windows service
    #>

    try {
        Write-Log "Starting installation of ECS Agent..."
        Import-Module ECSTools

        $InitializeAgentArgs = @{
            RequiredRuntimeVersion = $ContainerRuntimeVersion;
            AWSDefaultRegion = $Region;
            OverrideSourceRegion = $Region;
            OverrideSourceBucket = $Script:ECSAgentSourceBucket;
            Version = $ECSVersion;
            Cluster = $Cluster;
            ECSEndpoint = $ECSEndpoint;
            LoggingDrivers = '["json-file","awslogs"]';
        }
        Initialize-ECSAgent @InitializeAgentArgs -ExternalInstance -EnableTaskIAMRole
        Test-ServiceStatus -ServiceName $Script:AmazonECSServiceName
    } catch {
        throw "Failed to install ECS Agent on the instance: {0}" -f $_.Exception.Message
    }
}

Function Remove-SSMArtifacts {
    <#
    .SYNOPSIS
    This method stops and uninstalls AWS SSM from the customer instance.

    .DESCRIPTION
    This method stop the AmazonSSM service and uninstalls AWS SSM from the customer instance.
    #>

    try {
        Write-Log "Starting uninstallation of any existing SSM agent version..."
        # Check and remove the SSM Agent service, if it exists.
        $existingSvc = Get-WmiObject -Class Win32_Service -Filter "Name='$Script:SSMAgentServiceName'"
        if ($existingSvc -ne $null) {
            Write-Log "Existing SSM agent installation found. Stopping and deleting the service."
            $existingSvc.StopService()
            $existingSvc.Delete()
            # Wait few seconds for the service to be deleted.
            Start-Sleep 1
        }

        Write-Log "Uninstalling any existing SSM agent installation"
        if (-not (Test-Path $Script:SSMAgentInstallerFullPath)) {
            Get-FileFromS3 -S3FileURL $Script:SSMAgentS3URL -OutputFilePath $Script:SSMAgentInstallerFullPath
            # TODO: Currently, SSM Agent does not publish hash for their artifacts and therefore, we are not validating the hash for now.
            # In the future, when hash is published along with the agent artifacts, we need to start validating the hash as well.
        }
        Start-Process $Script:SSMAgentInstallerFullPath -ArgumentList @('/uninstall', '/q', '/norestart') -Wait
    } catch {
        throw "Failed to uninstall SSM on the instance: {0}" -f $_.Exception.Message
    }
    Write-Log "Uninstallation of SSM agent succeeded."
}

Function Remove-ECSArtifacts {
    <#
    .SYNOPSIS
    This method stops and uninstalls Amazon ECS along with other components from the customer instance.

    .DESCRIPTION
    This method stops the AmazonECS service and removes the service along with ECSTools from the external instance.
    #>

    try {
        Write-Log "Starting uninstallation of any existing ECS artifacts..."
        # Remove Amazon ECS service.
        Import-Module ECSTools
        Remove-ECSAgentInstallation

        # Remove the installation folder for Amazon ECS.
        Remove-Item -Recurse -Force $Script:ECSInstallationPath

        # Remove the cache folder for Amazon ECS.
        Remove-Item -Recurse -Force $Script:ECSCache

        # If ECSTools module exists in the current session, then remove it.
        Get-Module -Name ECSTools | Remove-Module

        # Remove the module from Powershell.
        if (Test-Path $Script:ECSModulePath)
        {
            Remove-Item -Recurse -Force $Script:ECSModulePath
        }
        Write-Log "Uninstallation of ECS artifacts succeeded."
    } catch {
        throw "Failed to uninstall ECS Agent on the instance: {0}" -f $_.Exception.Message
    }
}

try {
    # Initialize all the dependencies for running this script.
    Initialize-ScriptDependencies
    # Validate if the current OS release is supported for running Amazon ECS Anywhere.
    Test-OSRelease
    # Validate the parameters with which the script was invoked.
    Test-ScriptParameters

    # Install the helper Amazon ECS Powershell module.
    Install-ECSToolsModule

    if (-not $Uninstall)
    {
        # Install container runtime before installing AWS SSM or Amazon ECS.
        Install-ContainerRuntime

        if (-not $SkipRegistration)
        {
            Install-SSMAgent
        }

        Compress-ECSExecArtifacts

        Install-ECSAgent

        Write-Log "Installation of Amazon ECS on this instance was successful."
    }
    else
    {
        # Uninstallation order is opposite of installation order.
        Remove-ECSArtifacts
        Remove-SSMArtifacts

        Write-Log "Uninstallation of AWS SSM and Amazon ECS on this instance was successful."
    }
} catch {
    Write-Log ("[ERROR] Failed to setup Amazon ECS Anywhere on this instance. Exception: {0}" -f $_.Exception.Message)
    Exit 1
} finally {
    Remove-Item -Recurse -Force $Script:TempDirectory
}