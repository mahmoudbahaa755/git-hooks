#!/bin/bash

# Check if the current directory is a Git repository
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "Error: This is not a Git repository."
    exit 1
fi

# Get Git user name
user_name=$(git config user.name)
if [ -z "$user_name" ]; then
    echo "Error: Git user.name is not configured."
    exit 1
fi

# Get number of days before today (default is 0)
days_ago=${1:-0}
since_date=$(date -d "$days_ago days ago" +"%Y-%m-%d")
today=$(date +"%Y-%m-%d")
now=$(date +"%Y-%m-%d %H:%M")
output_file="Git_Report_${today}_since_${since_date}.txt"

# Create header
{
    echo "╔══════════════════════════════════════════════════╗"
    echo "║               DAILY DEVELOPMENT REPORT           ║"
    echo "╠══════════════════════════════════════════════════╣"
    echo "║  Developer: $user_name"
    echo "║  Date:      $today"
    echo "║  Since:     $since_date"
    echo "║  Generated: $now"
    echo "╚══════════════════════════════════════════════════╝"
    echo ""
} > "$output_file"

# Process Git logs
git log \
    --author="$user_name" \
    --since="$since_date 00:00" \
    --reverse \
    --pretty=format:"%ad|%h|%s" \
    --date=iso \
    --name-only | {
    
    commit_count=0
    file_count=0
    
    while IFS= read -r line; do
        if [[ $line == *"|"* ]]; then
            IFS='|' read -r date hash message <<< "$line"
            commit_time=$(date -d "$date" +"%Y-%m-%d %H:%M")
            
            # Add commit separator
            [ $commit_count -gt 0 ] && echo "" >> "$output_file"
            
            # Write commit header
            {
                echo "┌───────────────────────────────────────────────────"
                printf "│ Commit Time:  %-35s \n" "$commit_time"
                printf "│ Commit ID:    %-35s \n" "$hash"
                printf "│ Message:      %-35s \n" "$message"
                echo "├───────────────────────────────────────────────────"
                echo "│ Changed Files:"
            } >> "$output_file"
            
            ((commit_count++))
        elif [ -n "$line" ]; then
            echo "│   • $line" >> "$output_file"
            ((file_count++))
        fi
    done
    
    # Add summary
    {
        echo ""
        echo "┌───────────────────────────────────────────────────"
        echo "│                     SUMMARY                       "
        echo "├───────────────────────────────────────────────────"
        printf "│ Total Commits:    %-4d \n" $commit_count
        printf "│ Files Changed:    %-4d \n" $file_count
        echo "└───────────────────────────────────────────────────"
    } >> "$output_file"
}

echo "Report generated: $output_file"