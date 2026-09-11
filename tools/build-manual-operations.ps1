$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$sourceDirectory = Join-Path $root 'data\manual-operations'
$exportDirectory = Join-Path $root 'data\exported-operations'
$registryPath = Join-Path $root 'data\personnel-registry.json'
$archivePath = Join-Path $root 'data\operations.json'

$registry = Get-Content -Raw -LiteralPath $registryPath | ConvertFrom-Json
$archive = Get-Content -Raw -LiteralPath $archivePath | ConvertFrom-Json
if ($registry.schemaVersion -ne 1 -or $archive.schemaVersion -ne 1) { throw 'Unsupported data schema.' }

$registryBySteamId = @{}
foreach ($person in @($registry.people)) {
    $steamId = [string]$person.steamId
    if ($steamId -notmatch '^\d{17}$') { throw "Invalid Steam UID in personnel registry: '$steamId'" }
    $registryBySteamId[$steamId] = $person
}

$namespaceKey = [Text.Encoding]::UTF8.GetBytes('MisfitsOperationsHub/personnel/v1')
$hmac = [Security.Cryptography.HMACSHA256]::new($namespaceKey)
function Get-PublicId([string]$SteamId) {
    $digest = $hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($SteamId))
    return 'mf-' + (-join ($digest[0..9] | ForEach-Object { $_.ToString('x2') }))
}
function Get-PublicName([string]$SteamId) {
    if ($registryBySteamId.ContainsKey($SteamId)) { return [string]$registryBySteamId[$SteamId].name }
    return $SteamId
}
function Get-RequiredProperty($Object, [string]$Name, [string]$Context) {
    $property = $Object.PSObject.Properties[$Name]
    if ($null -eq $property -or $null -eq $property.Value -or ([string]$property.Value).Length -eq 0) {
        throw "$Context is missing required property '$Name'."
    }
    return $property.Value
}

try {
    $sourceOperations = @()
    $sourceIds = @{}
    $inputFiles = @(
        @(Get-ChildItem -LiteralPath $sourceDirectory -Filter '*.json' -File | ForEach-Object { [pscustomobject]@{ File = $_; Manual = $true } })
        @(Get-ChildItem -LiteralPath $exportDirectory -Filter '*.json' -File | ForEach-Object { [pscustomobject]@{ File = $_; Manual = $false } })
    ) | Sort-Object { $_.File.Name }
    foreach ($input in $inputFiles) {
        $file = $input.File
        $isManual = $input.Manual
        $context = "$(if ($isManual) {'Manual'} else {'Exported'}) operation '$($file.Name)'"
        try { $source = Get-Content -Raw -LiteralPath $file.FullName | ConvertFrom-Json }
        catch { throw "$context is not valid JSON: $($_.Exception.Message)" }

        if (-not $isManual) {
            if ($source.schemaVersion -ne 1 -or $source.source -ne 'maux_operations_export' -or $null -eq $source.operation) {
                throw "$context is not a supported Misfits operation export."
            }
            $source = $source.operation
            foreach ($author in @($source.authors)) {
                if ($null -eq $author.PSObject.Properties['steamId']) { $author | Add-Member -NotePropertyName steamId -NotePropertyValue ([string]$author.id) }
            }
            foreach ($player in @($source.players)) {
                if ($null -eq $player.PSObject.Properties['steamId']) { $player | Add-Member -NotePropertyName steamId -NotePropertyValue ([string]$player.id) }
            }
        }

        foreach ($field in @('id','name','date','campaign','terrain','result','players')) {
            [void](Get-RequiredProperty $source $field $context)
        }
        $operationId = [string]$source.id
        if ($sourceIds.ContainsKey($operationId)) { throw "Duplicate source operation id '$operationId'." }
        $sourceIds[$operationId] = $true
        if ([string]$source.date -notmatch '^\d{4}-\d{2}-\d{2}$') { throw "$context date must use YYYY-MM-DD." }
        $durationProperty = $source.PSObject.Properties['durationSeconds']
        if ($null -ne $durationProperty -and $null -ne $durationProperty.Value -and [double]$durationProperty.Value -lt 0) { throw "$context durationSeconds cannot be negative." }

        $qualityProperty = $source.PSObject.Properties['recordQuality']
        $quality = if ($null -eq $qualityProperty) { 'partial' } else { ([string]$qualityProperty.Value).ToLowerInvariant() }
        if ($quality -notin @('attendance','partial','full')) { throw "$context recordQuality must be attendance, partial, or full." }

        $authors = @()
        $primaryCount = 0
        $authorProperty = $source.PSObject.Properties['authors']
        foreach ($author in $(if ($null -eq $authorProperty) { @() } else { @($authorProperty.Value) })) {
            $steamId = [string](Get-RequiredProperty $author 'steamId' "$context author")
            if ($steamId -notmatch '^\d{17}$') { throw "$context has invalid author Steam UID '$steamId'." }
            $roleProperty = $author.PSObject.Properties['role']
            $role = if ($null -eq $roleProperty) { 'coauthor' } else { ([string]$roleProperty.Value).ToLowerInvariant() }
            if ($role -notin @('primary','coauthor')) { throw "$context author role must be primary or coauthor." }
            if ($role -eq 'primary') { $primaryCount++ }
            $authors += [pscustomobject][ordered]@{ id = Get-PublicId $steamId; name = Get-PublicName $steamId; role = $role }
        }
        if ($primaryCount -gt 1) { throw "$context has more than one primary author." }

        $players = @()
        $playerIds = @{}
        foreach ($player in @($source.players)) {
            $steamId = [string](Get-RequiredProperty $player 'steamId' "$context player")
            if ($steamId -notmatch '^\d{17}$') { throw "$context has invalid player Steam UID '$steamId'." }
            if ($playerIds.ContainsKey($steamId)) { throw "$context lists player '$steamId' more than once." }
            $playerIds[$steamId] = $true
            $outputPlayer = [ordered]@{ id = Get-PublicId $steamId; name = Get-PublicName $steamId }
            foreach ($field in @('role','group','playtimeSeconds','kills','infantryKills','vehicleKills','friendlyKills','longestKill','shots','launcherShots','grenades','explosives','deaths','respawns','unconscious','treatments','damageReceived','distanceFoot','distanceVehicle','vehicleTime')) {
                $property = $player.PSObject.Properties[$field]
                if ($null -ne $property) { $outputPlayer[$field] = $property.Value }
            }
            $players += [pscustomobject]$outputPlayer
        }

        $summaryProperty = $source.PSObject.Properties['summary']
        $imageProperty = $source.PSObject.Properties['image']
        $image = if ($null -eq $imageProperty) { '' } else { [string]$imageProperty.Value }
        if ($image -and $image -notmatch '^assets/operations/[A-Za-z0-9._/-]+\.(jpg|jpeg|png|webp|svg)$') {
            throw "$context image must be a relative assets/operations path using jpg, jpeg, png, webp, or svg."
        }
        $outputOperation = [ordered]@{
            id = $operationId
            name = [string]$source.name
            campaign = [string]$source.campaign
            terrain = [string]$source.terrain
            date = [string]$source.date
            durationSeconds = if ($null -eq $durationProperty -or $null -eq $durationProperty.Value) { $null } else { [math]::Round([double]$durationProperty.Value) }
            result = [string]$source.result
            summary = if ($null -eq $summaryProperty) { '' } else { [string]$summaryProperty.Value }
            authors = $authors
            players = $players
            manual = $isManual
            recordQuality = $quality
            sourceFile = $file.Name
        }
        if ($image) { $outputOperation['image'] = $image }
        $sourceOperations += [pscustomobject]$outputOperation
    }

    $exportedIds = @{}
    foreach ($operation in @($sourceOperations | Where-Object { $_.manual -ne $true })) { $exportedIds[[string]$operation.id] = $true }
    $automaticOperations = @($archive.operations | Where-Object {
        $manualProperty = $_.PSObject.Properties['manual']
        ($null -eq $manualProperty -or $manualProperty.Value -ne $true) -and -not $exportedIds.ContainsKey([string]$_.id)
    })
    $automaticIds = @{}
    foreach ($operation in $automaticOperations) { $automaticIds[[string]$operation.id] = $true }
    foreach ($operation in @($sourceOperations | Where-Object { $_.manual -eq $true })) {
        if ($automaticIds.ContainsKey([string]$operation.id)) { throw "Manual operation id '$($operation.id)' already belongs to an exported operation." }
    }

    $archive.operations = @($automaticOperations) + @($sourceOperations)
    # Keep the archive timestamp stable for manual-only rebuilds. Updating it on
    # every run creates a bot commit even when no operation data changed, which
    # cancels the Pages deployment that triggered this workflow.
    $json = $archive | ConvertTo-Json -Depth 20
    foreach ($person in @($registry.people)) {
        if ($json.Contains([string]$person.steamId)) { throw 'A registered Steam UID remains in generated operation data.' }
    }
    [IO.File]::WriteAllText($archivePath, $json + [Environment]::NewLine, [Text.UTF8Encoding]::new($false))
    Write-Host "Built $($sourceOperations.Count) source operation record(s)." -ForegroundColor Green
} finally {
    $hmac.Dispose()
    [Array]::Clear($namespaceKey, 0, $namespaceKey.Length)
}
