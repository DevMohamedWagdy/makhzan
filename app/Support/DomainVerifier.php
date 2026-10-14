<?php

namespace App\Support;

/**
 * Checks that a vendor's domain points at the platform: a CNAME to the configured target,
 * or an A record with the configured IP. Bound in the container so tests can replace it.
 */
class DomainVerifier
{
    public function pointsToUs(string $domain): bool
    {
        $target = $this->normalize((string) config('makhzan.custom_domains.cname_target'));
        $ip = config('makhzan.custom_domains.ip');

        $cnames = array_map(fn (array $record): string => $this->normalize($record['target'] ?? ''), @dns_get_record($domain, DNS_CNAME) ?: []);

        if ($target !== '' && in_array($target, $cnames, true)) {
            return true;
        }

        $ips = array_column(@dns_get_record($domain, DNS_A) ?: [], 'ip');

        return filled($ip) && in_array($ip, $ips, true);
    }

    private function normalize(string $host): string
    {
        return rtrim(strtolower(trim($host)), '.');
    }
}
